export type HouseholdRole = "owner" | "member"
export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled"

export interface Member {
  memberId: string
  householdId: string
  userId: string
  role: HouseholdRole
  enabled: boolean
  /** Módulos liberados ao funcionário (owner = acesso total, ignora). */
  permissions: string[]
  userName: string
  userEmail: string
  joinedAt: string
}

export interface Invitation {
  id: string
  householdId: string
  invitedBy: string
  email: string
  role: HouseholdRole
  status: InvitationStatus
  expiresAt: string
  createdAt: string
}

/** Resposta do convite: a invitation + o link de aceite (exposto p/ teste em dev). */
export interface InviteResult {
  invitation: Invitation
  acceptUrl: string
}
