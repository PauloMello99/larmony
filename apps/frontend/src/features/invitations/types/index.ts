import type { HouseholdRole } from "@/features/households/types"

export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled"

export interface InvitationLookup {
  householdId: string
  householdName: string
  householdSlug: string
  email: string
  role: HouseholdRole
  status: InvitationStatus
  expired: boolean
  hasAccount: boolean
}

export interface AcceptInvitationResult {
  householdId: string
  householdSlug: string
}
