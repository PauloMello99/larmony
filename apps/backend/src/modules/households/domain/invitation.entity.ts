import type { HouseholdRole } from "./household.entity";

export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled";

export interface InvitationEntityProps {
  id: string;
  householdId: string;
  invitedBy: string;
  email: string;
  role: HouseholdRole;
  status: InvitationStatus;
  /** Token secreto do link de aceite. */
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export class InvitationEntity {
  readonly id: string;
  readonly householdId: string;
  readonly invitedBy: string;
  readonly email: string;
  readonly role: HouseholdRole;
  readonly status: InvitationStatus;
  readonly token: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;

  private constructor(props: InvitationEntityProps) {
    this.id = props.id;
    this.householdId = props.householdId;
    this.invitedBy = props.invitedBy;
    this.email = props.email;
    this.role = props.role;
    this.status = props.status;
    this.token = props.token;
    this.expiresAt = props.expiresAt;
    this.createdAt = props.createdAt;
  }

  /** Convite ainda aproveitável (pendente e não expirado). */
  isAcceptable(now: Date = new Date()): boolean {
    return this.status === "pending" && this.expiresAt > now;
  }

  static create(props: InvitationEntityProps): InvitationEntity {
    return new InvitationEntity(props);
  }
}
