import type { HouseholdRole } from "./household.entity";

export interface MemberEntityProps {
  memberId: string;
  householdId: string;
  userId: string;
  role: HouseholdRole;
  enabled: boolean;
  /** Módulos liberados ao funcionário (on/off). Owner ignora (acesso total). */
  permissions: string[];
  userName: string;
  userEmail: string;
  joinedAt: Date;
}

export class MemberEntity {
  readonly memberId: string;
  readonly householdId: string;
  readonly userId: string;
  readonly role: HouseholdRole;
  readonly enabled: boolean;
  readonly permissions: string[];
  readonly userName: string;
  readonly userEmail: string;
  readonly joinedAt: Date;

  private constructor(props: MemberEntityProps) {
    this.memberId = props.memberId;
    this.householdId = props.householdId;
    this.userId = props.userId;
    this.role = props.role;
    this.enabled = props.enabled;
    this.permissions = props.permissions ?? [];
    this.userName = props.userName;
    this.userEmail = props.userEmail;
    this.joinedAt = props.joinedAt;
  }

  static create(props: MemberEntityProps): MemberEntity {
    return new MemberEntity(props);
  }
}
