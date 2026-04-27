import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is coordinateur or gestionnaire
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller role
    const { data: callerRole } = await adminClient.from("user_roles").select("role").eq("user_id", caller.id).single();
    if (!callerRole || !["gestionnaire", "coordinateur"].includes(callerRole.role)) {
      throw new Error("Insufficient permissions");
    }

    const { user_id } = await req.json();
    if (!user_id) throw new Error("Missing user_id");

    // If coordinateur admin, verify target user belongs to same coordinateur
    if (callerRole.role === "coordinateur") {
      const { data: callerProfile } = await adminClient.from("profiles").select("coordinateur_id").eq("user_id", caller.id).single();
      const { data: targetProfile } = await adminClient.from("profiles").select("coordinateur_id").eq("user_id", user_id).single();
      if (!callerProfile?.coordinateur_id || callerProfile.coordinateur_id !== targetProfile?.coordinateur_id) {
        throw new Error("Cannot delete user from another coordinateur");
      }
    }

    // Delete profile and role first (cascade), then auth user
    await adminClient.from("user_roles").delete().eq("user_id", user_id);
    await adminClient.from("profiles").delete().eq("user_id", user_id);
    const { error } = await adminClient.auth.admin.deleteUser(user_id);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
