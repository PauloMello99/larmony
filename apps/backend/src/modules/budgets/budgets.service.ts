import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common'
import { format } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class BudgetsService {
  private parseMonthYear(month: string, year: string) {
    const m = Number(month)
    const y = Number(year)
    if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y) || y < 2000 || y > 2100) {
      throw new BadRequestException('month and year query params are required and must be valid')
    }
    return { m, y }
  }

  async findAll(supabase: SupabaseClient, householdId: string, month: string, year: string) {
    const { m, y } = this.parseMonthYear(month, year)
    const { data, error } = await supabase
      .from('budgets')
      .select('*, categories(name, color)')
      .eq('household_id', householdId)
      .eq('month', m)
      .eq('year', y)

    if (error) throw new InternalServerErrorException(error.message)
    return data ?? []
  }

  async getSpending(supabase: SupabaseClient, householdId: string, month: string, year: string) {
    const { m, y } = this.parseMonthYear(month, year)
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

    if (error) throw new InternalServerErrorException(error.message)

    const spending: Record<string, number> = {}
    for (const t of data ?? []) {
      if (t.category_id) spending[t.category_id] = (spending[t.category_id] ?? 0) + t.amount
    }
    return spending
  }

  async create(supabase: SupabaseClient, householdId: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('budgets')
      .insert({ ...payload, household_id: householdId })
      .select()
      .single()

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async update(supabase: SupabaseClient, id: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('budgets')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async remove(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (error) throw new InternalServerErrorException(error.message)
  }
}
