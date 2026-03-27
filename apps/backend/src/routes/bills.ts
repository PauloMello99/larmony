import { Hono } from 'hono'
import type { SupabaseClient } from '@supabase/supabase-js'

const bills = new Hono()

bills.get('/', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')
  const householdId = c.req.query('householdId')
  if (!householdId) return c.json({ error: 'householdId is required' }, 400)

  const { data, error } = await supabase
    .from('bills')
    .select('*, categories(name, color)')
    .eq('household_id', householdId)
    .order('due_day')

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data ?? [])
})

bills.post('/', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')
  const body = await c.req.json()
  const { householdId, ...payload } = body
  if (!householdId) return c.json({ error: 'householdId is required' }, 400)

  const { data, error } = await supabase
    .from('bills')
    .insert({ ...payload, household_id: householdId })
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data, 201)
})

bills.put('/:id', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')
  const id = c.req.param('id')
  const payload = await c.req.json()

  const { data, error } = await supabase
    .from('bills')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

bills.delete('/:id', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')
  const id = c.req.param('id')

  const { error } = await supabase.from('bills').delete().eq('id', id)
  if (error) return c.json({ error: error.message }, 500)
  return c.body(null, 204)
})

export default bills
