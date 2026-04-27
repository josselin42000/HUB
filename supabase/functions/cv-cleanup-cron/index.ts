import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Récupère réglages de rétention par centre
    const { data: settings } = await supabase.from("app_settings").select("centre_id, value").eq("key", "cv_retention_months");
    const retentionByCentre = new Map<string | null, number>();
    (settings ?? []).forEach((s: any) => retentionByCentre.set(s.centre_id, parseInt(s.value, 10) || 6));

    // Récupère tous les centres
    const { data: centres } = await supabase.from("centres").select("id");
    let deleted = 0;

    for (const c of centres ?? []) {
      const months = retentionByCentre.get(c.id) ?? 6;
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      const { data: expired } = await supabase.from("cvs").select("id, cv_file_url, motivation_file_url")
        .eq("centre_id", c.id).lt("created_at", cutoff.toISOString());
      for (const cv of expired ?? []) {
        // tentative suppression fichiers (best effort)
        for (const url of [cv.cv_file_url, cv.motivation_file_url]) {
          if (!url) continue;
          const m = url.match(/\/public-cvs\/(.+)$/);
          if (m) await supabase.storage.from("public-cvs").remove([m[1]]).catch(() => {});
        }
        await supabase.from("cvs").delete().eq("id", cv.id);
        deleted++;
      }
    }

    return new Response(JSON.stringify({ ok: true, deleted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
