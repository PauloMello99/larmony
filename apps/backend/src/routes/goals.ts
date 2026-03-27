import { Hono } from 'hono'
import type { SupabaseClient } from '@supabase/supabase-js'

const goals = new Hono()

goals.get('/', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')
  const householdId = c.req.query('householdId')
  if (!householdId) return c.json({ error: 'householdId is required' }, 400)

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data ?? [])
})

goals.get('/:id/contributions', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')
  const id = c.req.param('id')

  const { data, error } = await supabase
    .from('goal_contributions')
    .select('*')
    .eq('goal_id', id)
    .order('date', { ascending: false })

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data ?? [])
})

goals.post('/', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')
  const body = await c.req.json()
  const { householdId, ...payload } = body
  if (!householdId) return c.json({ error: 'householdId is required' }, 400)

  const { data, error } = await supabase
    .from('goals')
    .insert({ ...payload, household_id: householdId })
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data, 201)
})

goals.post('/:id/contributions', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')
  const body = await c.req.json()
  const { householdId, userId, ...payload } = body
  if (!householdId || !userId) {
    return c.json({ error: 'householdId and userId are required' }, 400)
  }

  const { data, error } = await supabase
    .from('goal_contributions')
    .insert({ ...payload, goal_id: c.req.param('id'), household_id: householdId, created_by: userId })
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data, 201)
})

goals.put('/:id', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')
  const id = c.req.param('id')
  const payload = await c.req.json()

  const { data, error } = await supabase.from('goals').update(payload).eq('id', id).select().single()
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

goals.delete('/:id', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')
  const id = c.req.param('id')

  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) return c.json({ error: error.message }, 500)
  return c.body(null, 204)
})

export default goals
