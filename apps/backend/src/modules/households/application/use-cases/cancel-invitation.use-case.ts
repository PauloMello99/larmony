import { Inject, Injectable } from "@nestjs/common";
import {
  IHouseholdRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/household.repository.interface";
import {
  IInvitationRepository,
  INVITATION_REPOSITORY,
} from "../../domain/invitation.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import { HouseholdForbiddenException } from "../../domain/exceptions/household-forbidden.exception";
import { InvitationNotFoundException } from "../../domain/exceptions/invitation-not-found.exception";

@Injectable()
export class CancelInvitationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly householdRepo: IHouseholdRepository,
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepo: IInvitationRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    householdId: string,
    invitationId: string,
    authId: string,
  ): Promise<void> {
    const isOwner = await this.householdRepo.isOwner(householdId, authId);
    if (!isOwner) throw new HouseholdForbiddenException();

    const invitation = await this.invitationRepo.findById(invitationId, householdId);
    if (!invitation) throw new InvitationNotFoundException(invitationId);

    await this.invitationRepo.cancel(invitationId);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "delete",
      entityType: "org_invitation",
      entityId: invitationId,
      metadata: { reason: "cancelled" },
    });
  }
}
