import { Injectable, InternalServerErrorException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class MembersService {
  async findAll(supabase: SupabaseClient, householdId: string) {
    const { data: memberships, error } = await supabase
      .from('household_memberships')
      .select('id, user_id, role, joined_at')
      .eq('household_id', householdId)

    if (error) throw new InternalServerErrorException(error.message)
    if (!memberships?.length) return []

    const userIds = memberships.map((m) => m.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds)

    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))

    return memberships.map((m) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      full_name: profileMap[m.user_id]?.full_name ?? null,
      avatar_url: profileMap[m.user_id]?.avatar_url ?? null,
    }))
  }
}
