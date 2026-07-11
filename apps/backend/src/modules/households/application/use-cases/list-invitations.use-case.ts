import { Inject, Injectable } from "@nestjs/common";
import type { InvitationEntity } from "../../domain/invitation.entity";
import {
  IHouseholdRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/household.repository.interface";
import {
  IInvitationRepository,
  INVITATION_REPOSITORY,
} from "../../domain/invitation.repository.interface";
import { HouseholdForbiddenException } from "../../domain/exceptions/household-forbidden.exception";

@Injectable()
export class ListInvitationsUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly householdRepo: IHouseholdRepository,
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepo: IInvitationRepository,
  ) {}

  async execute(
    householdId: string,
    authId: string,
  ): Promise<InvitationEntity[]> {
    const isOwner = await this.householdRepo.isOwner(householdId, authId);
    if (!isOwner) throw new HouseholdForbiddenException();

    return this.invitationRepo.findPendingByHousehold(householdId);
  }
}
