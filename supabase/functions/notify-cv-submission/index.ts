import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { centre_id, nom, prenom, poste, offer_title } = await req.json();
    if (!centre_id || !nom || !poste) {
      return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Trouver les admins (fonciere + centre du centre concerné)
    const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("role", ["fonciere", "centre", "proprietaire"]);
    const adminIds = new Set<string>();
    for (const r of roles ?? []) {
      if (r.role === "fonciere" || r.role === "proprietaire") { adminIds.add(r.user_id); continue; }
      const { data: p } = await supabase.from("profiles").select("centre_id").eq("user_id", r.user_id).maybeSingle();
      if (p?.centre_id === centre_id) adminIds.add(r.user_id);
    }

    if (adminIds.size === 0) return new Response(JSON.stringify({ ok: true, recipients: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Insérer une notification système
    const candidatLabel = `${nom}${prenom ? " " + prenom : ""}`;
    const title = "Nouveau CV à valider";
    const body = offer_title ? `${candidatLabel} a postulé pour : ${offer_title}` : `${candidatLabel} — ${poste} (candidature spontanée)`;

    // On crée une notif "système" (created_by = premier admin pour satisfaire NOT NULL)
    const firstAdmin = Array.from(adminIds)[0];
    const { data: notif } = await supabase.from("notifications").insert({
      centre_id, created_by: firstAdmin, created_by_name: "Système",
      title, body, notif_type: "info", target_scope: "centre", target_centre_id: centre_id, link_url: "/cvtheque",
    } as any).select().single();

    if (notif) {
      const recipients = Array.from(adminIds).map(uid => ({ notification_id: (notif as any).id, user_id: uid }));
      await supabase.from("notification_recipients").insert(recipients as any);

      // Push
      try {
        await supabase.functions.invoke("send-push", {
          body: { notification_id: (notif as any).id, title, body },
        });
      } catch (e) { console.log("push error", e); }
    }

    return new Response(JSON.stringify({ ok: true, recipients: adminIds.size }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
