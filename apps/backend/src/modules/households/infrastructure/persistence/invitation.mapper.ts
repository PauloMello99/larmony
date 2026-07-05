import { InvitationEntity, type InvitationStatus } from "../../domain/invitation.entity";
import type { HouseholdRole } from "../../domain/household.entity";

interface InvitationRow {
  id: string;
  householdId: string;
  invitedBy: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export class InvitationMapper {
  static toDomain(row: InvitationRow): InvitationEntity {
    return InvitationEntity.create({
      id: row.id,
      householdId: row.householdId,
      invitedBy: row.invitedBy,
      email: row.email,
      role: row.role as HouseholdRole,
      status: row.status as InvitationStatus,
      token: row.token,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    });
  }
}
