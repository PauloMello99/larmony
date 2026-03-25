import { supabase } from '@/services/supabase'

export interface HouseholdMember {
  id: string
  user_id: string
  role: string
  joined_at: string
  full_name: string | null
  avatar_url: string | null
}

export async function getMembers(householdId: string): Promise<HouseholdMember[]> {
  const { data: memberships, error } = await supabase
    .from('household_memberships')
    .select('id, user_id, role, joined_at')
    .eq('household_id', householdId)
  if (error) throw error
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
