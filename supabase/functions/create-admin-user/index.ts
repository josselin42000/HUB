import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, password, name, user_id } = await req.json()

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // If user_id provided, just fix profile + role for existing user
    if (user_id) {
      const { error: pe } = await adminClient.from('profiles').upsert({
        user_id,
        email: email || '',
        name: name || 'Admin Foncière',
      }, { onConflict: 'user_id' })

      // Delete existing roles then insert gestionnaire
      await adminClient.from('user_roles').delete().eq('user_id', user_id)
      const { error: re } = await adminClient.from('user_roles').insert({
        user_id,
        role: 'gestionnaire',
      })

      return new Response(
        JSON.stringify({ success: true, profile_error: pe?.message, role_error: re?.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create new user
    const { data: { user }, error: userError } = await adminClient.auth.admin.createUser({
      email, password, email_confirm: true,
    })

    if (userError) {
      return new Response(
        JSON.stringify({ error: userError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    await adminClient.from('profiles').insert({ user_id: user!.id, email, name })
    await adminClient.from('user_roles').insert({ user_id: user!.id, role: 'gestionnaire' })

    return new Response(
      JSON.stringify({ success: true, email, role: 'gestionnaire', user_id: user!.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
