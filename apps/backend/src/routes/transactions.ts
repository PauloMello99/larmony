import { Hono } from 'hono'
import { format } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'

const transactions = new Hono()

transactions.get('/', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')
  const { householdId, month, year, type, categoryId, search } = c.req.query()
  if (!householdId || !month || !year) {
    return c.json({ error: 'householdId, month and year are required' }, 400)
  }

  const m = Number(month)
  const y = Number(year)
  const from = format(new Date(y, m - 1, 1), 'yyyy-MM-dd')
  const to = format(new Date(y, m, 0), 'yyyy-MM-dd')

  let q = supabase
    .from('transactions')
    .select('*, categories(name, color)')
    .eq('household_id', householdId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })

  if (type && type !== 'all') q = q.eq('type', type)
  if (categoryId) q = q.eq('category_id', categoryId)
  if (search) q = q.ilike('description', `%${search}%`)

  const { data, error } = await q
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data ?? [])
})

transactions.get('/summary', async (c) => {
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
    .select('type, amount')
    .eq('household_id', householdId)
    .gte('date', from)
    .lte('date', to)

  if (error) return c.json({ error: error.message }, 500)

  const rows = data ?? []
  const income = rows.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = rows.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  return c.json({ income, expense, balance: income - expense })
})

transactions.post('/', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')
  const body = await c.req.json()
  const { householdId, userId, ...payload } = body
  if (!householdId || !userId) {
    return c.json({ error: 'householdId and userId are required' }, 400)
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...payload, household_id: householdId, created_by: userId })
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data, 201)
})

transactions.put('/:id', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')
  const id = c.req.param('id')
  const payload = await c.req.json()

  const { data, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

transactions.delete('/:id', async (c) => {
  const supabase: SupabaseClient = c.get('supabase')
  const id = c.req.param('id')

  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) return c.json({ error: error.message }, 500)
  return c.body(null, 204)
})

export default transactions
