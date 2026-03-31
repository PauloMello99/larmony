import { Injectable, InternalServerErrorException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class CategoriesService {
  async findAll(supabase: SupabaseClient, householdId: string) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('household_id', householdId)
      .order('name')

    if (error) throw new InternalServerErrorException(error.message)
    return data ?? []
  }

  async create(supabase: SupabaseClient, householdId: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('categories')
      .insert({ ...payload, household_id: householdId })
      .select()
      .single()

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async update(supabase: SupabaseClient, id: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async remove(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw new InternalServerErrorException(error.message)
  }
}
