import { Inject, Injectable } from "@nestjs/common";
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
import { LastActiveOwnerException } from "../../domain/exceptions/last-active-owner.exception";

@Injectable()
export class SetMemberStatusUseCase {
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
    enabled: boolean,
  ): Promise<MemberEntity> {
    const isOwner = await this.householdRepo.isOwner(householdId, authId);
    if (!isOwner) throw new HouseholdForbiddenException();

    const member = await this.memberRepo.findByMemberId(memberId, householdId);
    if (!member) throw new MemberNotFoundException(memberId);

    if (member.enabled === enabled) return member;

    // Não deixar a household sem nenhum owner ativo.
    if (!enabled && member.role === "owner") {
      const activeOwners = await this.memberRepo.countActiveOwners(householdId);
      if (activeOwners <= 1) throw new LastActiveOwnerException();
    }

    const updated = await this.memberRepo.setEnabled(memberId, enabled);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "update",
      entityType: "org_membership",
      entityId: memberId,
      metadata: { memberId, enabled },
    });

    return updated;
  }
}
