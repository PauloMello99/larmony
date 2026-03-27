import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import * as membersApi from '@/api/members'
import { queryKeys } from './keys'

export type { HouseholdMember } from '@/api/members'

export function useMembers() {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: queryKeys.members.all(householdId ?? ''),
    queryFn: () => membersApi.getMembers(householdId!),
    enabled: !!householdId,
  })
}
