import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC = (Deno.env.get("VAPID_PUBLIC_KEY") ?? "").trim();
const VAPID_PRIVATE = (Deno.env.get("VAPID_PRIVATE_KEY") ?? "").trim();

function sanitizeSubject(raw: string): string {
  // Extract first email or https URL out of the raw value (handles "mailto: <a@b.c>", spaces, brackets…)
  const cleaned = raw.replace(/[<>]/g, " ").trim();
  const httpsMatch = cleaned.match(/https:\/\/\S+/i);
  if (httpsMatch) return httpsMatch[0];
  const emailMatch = cleaned.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) return `mailto:${emailMatch[0]}`;
  return "mailto:admin@example.com";
}

const VAPID_SUBJECT = sanitizeSubject(Deno.env.get("VAPID_SUBJECT") ?? "");

console.log("VAPID config", {
  subject: VAPID_SUBJECT,
  publicLen: VAPID_PUBLIC.length,
  privateLen: VAPID_PRIVATE.length,
  publicPrefix: VAPID_PUBLIC.slice(0, 6),
});

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
} catch (e) {
  console.error("setVapidDetails failed", (e as Error).message);
}

interface Payload {
  user_ids: string[];
  title: string;
  body: string;
  url?: string;
  notif_type?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = (await req.json()) as Payload;
    if (!payload?.user_ids?.length || !payload.title || !payload.body) {
      return new Response(JSON.stringify({ error: "user_ids, title, body required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", payload.user_ids);
    if (error) throw error;

    const notif = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/",
      type: payload.notif_type ?? "info",
    });

    let sent = 0;
    let removed = 0;
    await Promise.all(
      (subs ?? []).map(async (s: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            notif,
          );
          sent++;
        } catch (e: any) {
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", s.id);
            removed++;
          } else {
            console.error("push error", e?.statusCode, e?.body);
          }
        }
      }),
    );

    return new Response(JSON.stringify({ sent, removed, total: subs?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
