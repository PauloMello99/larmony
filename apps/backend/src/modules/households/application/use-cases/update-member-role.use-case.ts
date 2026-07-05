import { Inject, Injectable } from "@nestjs/common";
import type { HouseholdRole } from "../../domain/household.entity";
import type { MemberEntity } from "../../domain/member.entity";
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
export class UpdateMemberRoleUseCase {
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
    role: HouseholdRole,
  ): Promise<MemberEntity> {
    const isOwner = await this.householdRepo.isOwner(householdId, authId);
    if (!isOwner) throw new HouseholdForbiddenException();

    const member = await this.memberRepo.findByMemberId(memberId, householdId);
    if (!member) throw new MemberNotFoundException(memberId);

    const updated = await this.memberRepo.updateRole(memberId, role);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "update",
      entityType: "org_membership",
      entityId: memberId,
      metadata: { memberId, role },
    });

    return updated;
  }
}
