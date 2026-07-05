import { Inject, Injectable } from "@nestjs/common";
import {
  IHouseholdRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/household.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../domain/member.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import { HouseholdForbiddenException } from "../../domain/exceptions/household-forbidden.exception";
import { MemberNotFoundException } from "../../domain/exceptions/member-not-found.exception";

@Injectable()
export class RemoveMemberUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly householdRepo: IHouseholdRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    householdId: string,
    memberId: string,
    authId: string,
  ): Promise<void> {
    const isOwner = await this.householdRepo.isOwner(householdId, authId);
    if (!isOwner) throw new HouseholdForbiddenException();

    const member = await this.memberRepo.findByMemberId(memberId, householdId);
    if (!member) throw new MemberNotFoundException(memberId);

    await this.memberRepo.remove(memberId);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "delete",
      entityType: "org_membership",
      entityId: memberId,
      metadata: { memberId },
    });
  }
}
