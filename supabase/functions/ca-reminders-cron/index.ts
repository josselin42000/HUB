// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function shiftIfWeekend(d: Date): Date {
  const out = new Date(d);
  if (out.getDay() === 6) out.setDate(out.getDate() + 2);
  else if (out.getDay() === 0) out.setDate(out.getDate() + 1);
  return out;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function moisStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function renderTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: any = {};
  try { body = await req.json(); } catch { /* GET from cron */ }
  const dryRun = !!body.dry_run;
  const forceCentreId = body.force_centre_id ?? null;

  const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
  const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
  const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";
  if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  }

  const today = new Date();
  const todayMois = moisStr(today);

  let q = supabase.from("ca_reminder_settings").select("*").eq("is_active", true);
  if (forceCentreId) q = q.eq("centre_id", forceCentreId);
  const { data: settingsList, error: sErr } = await q;
  if (sErr) return new Response(JSON.stringify({ error: sErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let totalSent = 0;
  const details: any[] = [];

  for (const s of settingsList ?? []) {
    const initial = shiftIfWeekend(new Date(today.getFullYear(), today.getMonth(), s.day_of_month));
    const r1 = shiftIfWeekend(new Date(initial.getTime() + s.delay_relance_1 * 86400000));
    const r2 = shiftIfWeekend(new Date(r1.getTime() + s.delay_relance_2 * 86400000));
    const ef = shiftIfWeekend(new Date(r2.getTime() + s.delay_email_final * 86400000));

    let step: "initial" | "relance_1" | "relance_2" | "email_final" | null = null;
    if (sameDay(today, initial)) step = "initial";
    else if (sameDay(today, r1)) step = "relance_1";
    else if (sameDay(today, r2)) step = "relance_2";
    else if (sameDay(today, ef)) step = "email_final";

    if (forceCentreId && !step) step = "initial";

    if (!step) {
      details.push({ centre_id: s.centre_id, skipped: "not_a_scheduled_day" });
      continue;
    }

    const channelsKey = `channels_${step}` as const;
    const channels: string[] = (s as any)[channelsKey] ?? (step === "email_final" ? ["email"] : ["push"]);

    const { data: managers } = await supabase
      .from("profiles")
      .select("user_id, name, email, boutique_name, centre_id")
      .eq("centre_id", s.centre_id)
      .eq("is_manager", true);

    if (!managers?.length) { details.push({ centre_id: s.centre_id, step, skipped: "no_managers" }); continue; }

    const userIds = managers.map(m => m.user_id);
    const { data: caRows } = await supabase
      .from("ca_collecte")
      .select("user_id")
      .eq("mois", todayMois)
      .in("user_id", userIds);

    const submitted = new Set((caRows ?? []).map(r => r.user_id));
    const todo = managers.filter(m => !submitted.has(m.user_id));

    const { data: alreadyLogged } = await supabase
      .from("ca_reminder_log")
      .select("user_id, channel")
      .eq("mois", todayMois)
      .eq("step", step)
      .in("user_id", todo.map(t => t.user_id).length ? todo.map(t => t.user_id) : ["00000000-0000-0000-0000-000000000000"]);

    const stepLabels: Record<string, { title: string; body: string }> = {
      initial: { title: "📊 Saisie de votre CA", body: `Pensez à enregistrer votre chiffre d'affaires de ${todayMois}.` },
      relance_1: { title: "⏰ Rappel : votre CA", body: `Votre saisie de CA pour ${todayMois} est attendue.` },
      relance_2: { title: "⚠️ Dernier rappel CA", body: `Merci de saisir rapidement votre CA de ${todayMois}.` },
      email_final: { title: "Saisie CA en attente", body: `Votre saisie du chiffre d'affaires de ${todayMois} est toujours en attente.` },
    };
    const pushMsg = stepLabels[step];

    for (const t of todo) {
      for (const channel of channels) {
        const alreadySent = (alreadyLogged ?? []).some(r => r.user_id === t.user_id && r.channel === channel);
        if (alreadySent) continue;
        if (dryRun) { totalSent++; continue; }

        let success = true;
        let errorMessage: string | null = null;

        if (channel === "push") {
          if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
            success = false; errorMessage = "VAPID keys missing";
          } else {
            const { data: subs } = await supabase
              .from("push_subscriptions")
              .select("*")
              .eq("user_id", t.user_id);
            if (!subs?.length) { success = false; errorMessage = "no_subscription"; }
            else {
              for (const sub of subs) {
                try {
                  await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    JSON.stringify({ title: pushMsg.title, body: pushMsg.body, url: "/" })
                  );
                } catch (e: any) {
                  success = false; errorMessage = String(e?.message ?? e);
                }
              }
            }
          }
        } else if (channel === "email") {
          const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
          if (!RESEND_KEY) {
            success = false; errorMessage = "resend_not_configured";
          } else if (!t.email) {
            success = false; errorMessage = "no_email";
          } else {
            const subject = (s as any).email_subject ?? "Saisie CA en attente";
            const tplRaw = (s as any).email_template ?? `Bonjour {{name}},\n\nVotre saisie du CA pour {{mois}} est en attente.`;
            const rendered = renderTemplate(tplRaw, {
              name: t.name ?? "",
              mois: todayMois,
              boutique: t.boutique_name ?? "",
            });
            try {
              const r = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  from: "Alertes CA <onboarding@resend.dev>",
                  to: [t.email],
                  subject,
                  text: rendered,
                }),
              });
              if (!r.ok) { success = false; errorMessage = `resend_${r.status}: ${await r.text()}`; }
            } catch (e: any) {
              success = false; errorMessage = String(e?.message ?? e);
            }
          }
        }

        await supabase.from("ca_reminder_log").insert({
          centre_id: s.centre_id,
          user_id: t.user_id,
          mois: todayMois,
          step,
          channel,
          success,
          error_message: errorMessage,
        } as any);

        if (success) totalSent++;
      }
    }

    details.push({ centre_id: s.centre_id, step, channels, targets: todo.length });
  }

  return new Response(JSON.stringify({ ok: true, sent: totalSent, details }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
