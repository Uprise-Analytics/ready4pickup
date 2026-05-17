import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!

    // Service-role client — can delete auth users and bypass RLS
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Caller client — verifies the request comes from a real authenticated user
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify caller identity
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser()
    if (authError || !caller) {
      return json({ error: 'Unauthorized' }, 401)
    }

    // Check caller role
    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role, school_id')
      .eq('id', caller.id)
      .single()

    if (profileError || !callerProfile) return json({ error: 'Forbidden' }, 403)
    if (callerProfile.role !== 'school_admin' && callerProfile.role !== 'platform_owner') {
      return json({ error: 'Forbidden' }, 403)
    }

    const { userId } = await req.json()
    if (!userId) return json({ error: 'userId is required' }, 400)

    // school_admin: target must belong to same school and not be an admin
    if (callerProfile.role === 'school_admin') {
      const { data: target, error: targetError } = await adminClient
        .from('profiles')
        .select('school_id, role')
        .eq('id', userId)
        .single()

      if (targetError || !target) return json({ error: 'User not found' }, 404)
      if (target.school_id !== callerProfile.school_id) return json({ error: 'Forbidden' }, 403)
      if (target.role === 'school_admin' || target.role === 'platform_owner') {
        return json({ error: 'Cannot delete admins' }, 403)
      }
    }

    // Delete profile row first (avoids FK issues if no cascade is set)
    await adminClient.from('profiles').delete().eq('id', userId)

    // Delete the auth user — this is the privileged part that requires service role
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteError) throw deleteError

    return json({ success: true }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
