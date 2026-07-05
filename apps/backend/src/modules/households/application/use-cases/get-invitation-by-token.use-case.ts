import { Inject, Injectable } from "@nestjs/common";
import type { HouseholdRole } from "../../domain/household.entity";
import type { InvitationStatus } from "../../domain/invitation.entity";
import {
  IInvitationRepository,
  INVITATION_REPOSITORY,
} from "../../domain/invitation.repository.interface";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../../user/domain/user.repository.interface";
import { InvitationNotFoundException } from "../../domain/exceptions/invitation-not-found.exception";

export interface InvitationLookupView {
  householdId: string;
  householdName: string;
  householdSlug: string;
  email: string;
  role: HouseholdRole;
  status: InvitationStatus;
  expired: boolean;
  /** Se já existe conta para o e-mail convidado (drive login × cadastro). */
  hasAccount: boolean;
}

@Injectable()
export class GetInvitationByTokenUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepo: IInvitationRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(token: string): Promise<InvitationLookupView> {
    const found = await this.invitationRepo.findByToken(token);
    if (!found) throw new InvitationNotFoundException(token);

    const { invitation, householdName, householdSlug } = found;
    const account = await this.userRepo.findByEmail(invitation.email);

    return {
      householdId: invitation.householdId,
      householdName,
      householdSlug,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expired: invitation.expiresAt < new Date(),
      hasAccount: !!account,
    };
  }
}
