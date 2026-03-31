import { Injectable, InternalServerErrorException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class GoalsService {
  async findAll(supabase: SupabaseClient, householdId: string) {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })

    if (error) throw new InternalServerErrorException(error.message)
    return data ?? []
  }

  async findContributions(supabase: SupabaseClient, goalId: string) {
    const { data, error } = await supabase
      .from('goal_contributions')
      .select('*')
      .eq('goal_id', goalId)
      .order('date', { ascending: false })

    if (error) throw new InternalServerErrorException(error.message)
    return data ?? []
  }

  async create(supabase: SupabaseClient, householdId: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('goals')
      .insert({ ...payload, household_id: householdId })
      .select()
      .single()

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async createContribution(
    supabase: SupabaseClient,
    goalId: string,
    householdId: string,
    userId: string,
    payload: Record<string, unknown>,
  ) {
    const { data, error } = await supabase
      .from('goal_contributions')
      .insert({ ...payload, goal_id: goalId, household_id: householdId, created_by: userId })
      .select()
      .single()

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async update(supabase: SupabaseClient, id: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('goals')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async remove(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) throw new InternalServerErrorException(error.message)
  }
}
