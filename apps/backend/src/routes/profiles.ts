import { Hono } from 'hono'
import type { SupabaseClient } from '@supabase/supabase-js'

const profiles = new Hono()

/** Returns the authenticated user's profile and their households. */
profiles.get('/me', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return c.json({ error: 'Unauthorized' }, 401)

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { data: memberships } = await supabase
    .from('household_memberships')
    .select('household_id, role, households(id, name)')
    .eq('user_id', user.id)

  const households = (memberships ?? [])
    .filter((m) => m.households)
    .map((m) => ({
      id: (m.households as { id: string; name: string }).id,
      name: (m.households as { id: string; name: string }).name,
      role: m.role,
    }))

  return c.json({ profile, households })
})

/** Updates the authenticated user's profile (e.g. locale). */
profiles.patch('/me', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return c.json({ error: 'Unauthorized' }, 401)

  const payload = await c.req.json()
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

export default profiles
