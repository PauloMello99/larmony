import { Hono } from 'hono'
import { format } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'

const budgets = new Hono()

budgets.get('/', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')
  const { householdId, month, year } = c.req.query()
  if (!householdId || !month || !year) {
    return c.json({ error: 'householdId, month and year are required' }, 400)
  }

  const { data, error } = await supabase
    .from('budgets')
    .select('*, categories(name, color)')
    .eq('household_id', householdId)
    .eq('month', Number(month))
    .eq('year', Number(year))

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data ?? [])
})

budgets.get('/spending', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')
  const { householdId, month, year } = c.req.query()
  if (!householdId || !month || !year) {
    return c.json({ error: 'householdId, month and year are required' }, 400)
  }

  const m = Number(month)
  const y = Number(year)
  const from = format(new Date(y, m - 1, 1), 'yyyy-MM-dd')
  const to = format(new Date(y, m, 0), 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('transactions')
    .select('category_id, amount')
    .eq('household_id', householdId)
    .eq('type', 'expense')
    .gte('date', from)
    .lte('date', to)
    .not('category_id', 'is', null)

  if (error) return c.json({ error: error.message }, 500)

  const spending: Record<string, number> = {}
  for (const t of data ?? []) {
    if (t.category_id) spending[t.category_id] = (spending[t.category_id] ?? 0) + t.amount
  }
  return c.json(spending)
})

budgets.post('/', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')
  const body = await c.req.json()
  const { householdId, ...payload } = body
  if (!householdId) return c.json({ error: 'householdId is required' }, 400)

  const { data, error } = await supabase
    .from('budgets')
    .insert({ ...payload, household_id: householdId })
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data, 201)
})

budgets.put('/:id', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')
  const id = c.req.param('id')
  const payload = await c.req.json()

  const { data, error } = await supabase
    .from('budgets')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

budgets.delete('/:id', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')
  const id = c.req.param('id')

  const { error } = await supabase.from('budgets').delete().eq('id', id)
  if (error) return c.json({ error: error.message }, 500)
  return c.body(null, 204)
})

export default budgets
