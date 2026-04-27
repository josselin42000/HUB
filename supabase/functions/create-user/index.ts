import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BASIC_ROLES = ['boutique', 'securite', 'centre']
const ADVANCED_ROLES = ['fonciere', 'proprietaire']

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing auth' }, 401)

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authErr } = await adminClient.auth.getUser(token)
    if (authErr || !caller) return json({ error: 'Unauthorized' }, 401)

    const { data: callerRoleData } = await adminClient
      .from('user_roles').select('role').eq('user_id', caller.id).maybeSingle()
    const callerRole = (callerRoleData as any)?.role
    const isAdmin = ['proprietaire', 'fonciere', 'centre'].includes(callerRole)
    if (!isAdmin) return json({ error: 'Forbidden' }, 403)

    const body = await req.json()
    const { email, password, name, role, boutique_name, centre_id, is_manager, is_support } = body

    if (!email || !password || !name || !role) return json({ error: 'Missing fields' }, 400)

    if (ADVANCED_ROLES.includes(role) && callerRole !== 'proprietaire') {
      return json({ error: 'Only owner can create this role' }, 403)
    }
    if (!BASIC_ROLES.includes(role) && !ADVANCED_ROLES.includes(role)) {
      return json({ error: 'Invalid role' }, 400)
    }

    let targetCentreId: string | null = centre_id ?? null
    if (callerRole === 'centre') {
      const { data: cp } = await adminClient.from('profiles').select('centre_id').eq('user_id', caller.id).maybeSingle()
      targetCentreId = (cp as any)?.centre_id ?? null
    }

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { name, boutique_name, centre_id: targetCentreId, role },
    })
    if (createErr) return json({ error: createErr.message }, 400)
    const newId = created.user!.id

    await adminClient.from('profiles').upsert({
      user_id: newId, email, name, boutique_name: boutique_name ?? null,
      centre_id: targetCentreId, is_manager: !!is_manager,
    } as any, { onConflict: 'user_id' })

    await adminClient.from('user_roles').delete().eq('user_id', newId)
    await adminClient.from('user_roles').insert({ user_id: newId, role } as any)

    if (is_support) {
      await adminClient.from('support_permissions').upsert({
        user_id: newId, granted_by: caller.id,
        can_view_stats: false, can_view_sondages: false,
        can_view_informations: false, can_view_collecte: false,
      } as any, { onConflict: 'user_id' })
    }

    return json({ success: true, user_id: newId })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
