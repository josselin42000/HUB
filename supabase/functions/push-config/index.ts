const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const publicKey = (Deno.env.get("VAPID_PUBLIC_KEY") ?? "").trim();
  if (!publicKey) {
    return new Response(JSON.stringify({ error: "Missing VAPID public key" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ publicKey }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});