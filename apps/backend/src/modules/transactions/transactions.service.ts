import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { format } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface TransactionFilters {
  householdId: string
  month: string
  year: string
  type?: string
  categoryId?: string
  search?: string
}

@Injectable()
export class TransactionsService {
  private dateRange(month: string, year: string) {
    const m = Number(month)
    const y = Number(year)
    return {
      from: format(new Date(y, m - 1, 1), 'yyyy-MM-dd'),
      to: format(new Date(y, m, 0), 'yyyy-MM-dd'),
    }
  }

  async findAll(supabase: SupabaseClient, filters: TransactionFilters) {
    const { householdId, month, year, type, categoryId, search } = filters
    const { from, to } = this.dateRange(month, year)

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
    if (error) throw new InternalServerErrorException(error.message)
    return data ?? []
  }

  async getSummary(supabase: SupabaseClient, householdId: string, month: string, year: string) {
    const { from, to } = this.dateRange(month, year)

    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('household_id', householdId)
      .gte('date', from)
      .lte('date', to)

    if (error) throw new InternalServerErrorException(error.message)

    const rows = data ?? []
    const income = rows.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = rows.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expense, balance: income - expense }
  }

  async create(
    supabase: SupabaseClient,
    householdId: string,
    userId: string,
    payload: Record<string, unknown>,
  ) {
    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...payload, household_id: householdId, created_by: userId })
      .select()
      .single()

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async update(supabase: SupabaseClient, id: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async remove(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw new InternalServerErrorException(error.message)
  }
}
