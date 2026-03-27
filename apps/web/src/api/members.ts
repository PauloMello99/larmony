import { apiGet } from '@/services/apiClient'

export interface HouseholdMember {
  id: string
  user_id: string
  role: string
  joined_at: string
  full_name: string | null
  avatar_url: string | null
}

export function getMembers(householdId: string) {
  return apiGet<HouseholdMember[]>('/api/members', { householdId })
}
