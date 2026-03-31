import { Injectable, InternalServerErrorException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class BillsService {
  async findAll(supabase: SupabaseClient, householdId: string) {
    const { data, error } = await supabase
      .from('bills')
      .select('*, categories(name, color)')
      .eq('household_id', householdId)
      .order('due_day')

    if (error) throw new InternalServerErrorException(error.message)
    return data ?? []
  }

  async create(supabase: SupabaseClient, householdId: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('bills')
      .insert({ ...payload, household_id: householdId })
      .select()
      .single()

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async update(supabase: SupabaseClient, id: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('bills')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async remove(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('bills').delete().eq('id', id)
    if (error) throw new InternalServerErrorException(error.message)
  }
}
