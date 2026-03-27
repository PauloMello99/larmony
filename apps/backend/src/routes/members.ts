import { Hono } from 'hono'
import type { SupabaseClient } from '@supabase/supabase-js'

const members = new Hono()

members.get('/', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')
  const householdId = c.req.query('householdId')
  if (!householdId) return c.json({ error: 'householdId is required' }, 400)

  const { data: memberships, error } = await supabase
    .from('household_memberships')
    .select('id, user_id, role, joined_at')
    .eq('household_id', householdId)

  if (error) return c.json({ error: error.message }, 500)
  if (!memberships?.length) return c.json([])

  const userIds = memberships.map((m) => m.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds)

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))

  const result = memberships.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    full_name: profileMap[m.user_id]?.full_name ?? null,
    avatar_url: profileMap[m.user_id]?.avatar_url ?? null,
  }))

  return c.json(result)
})

export default members
