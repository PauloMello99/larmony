import { MemberEntity } from "../../domain/member.entity";
import type { HouseholdRole } from "../../domain/household.entity";

interface MemberRow {
  memberId: string;
  householdId: string;
  userId: string;
  role: string;
  enabled: boolean;
  permissions: string[] | null;
  userName: string;
  userEmail: string;
  joinedAt: Date;
}

export class MemberMapper {
  static toDomain(row: MemberRow): MemberEntity {
    return MemberEntity.create({
      memberId: row.memberId,
      householdId: row.householdId,
      userId: row.userId,
      role: row.role as HouseholdRole,
      enabled: row.enabled,
      permissions: row.permissions ?? [],
      userName: row.userName,
      userEmail: row.userEmail,
      joinedAt: row.joinedAt,
    });
  }
}
