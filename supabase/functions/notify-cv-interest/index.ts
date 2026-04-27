import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { boutique_group_id, cv_id, cv_nom, cv_poste } = await req.json();
    if (!boutique_group_id || !cv_id) {
      return new Response(JSON.stringify({ error: "boutique_group_id et cv_id requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Trouver les utilisateurs de cette boutique
    const { data: profiles } = await supabase.from("profiles").select("user_id").eq("boutique_group_id", boutique_group_id);
    const userIds = (profiles ?? []).map((p: any) => p.user_id);
    if (userIds.length === 0) return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Envoi push via la fonction send-push existante
    await supabase.functions.invoke("send-push", {
      body: {
        user_ids: userIds,
        title: "Nouveau profil pour vous",
        body: `${cv_nom ?? "Un candidat"} — ${cv_poste ?? "Poste"}`,
        url: "/",
      },
    });
    return new Response(JSON.stringify({ ok: true, sent: userIds.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
