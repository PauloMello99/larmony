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
import { MODULE_KEYS, isModuleKey } from "../../domain/member-permissions";

/**
 * Owner configura os módulos liberados a um **funcionário** (on/off). Owners não
 * usam permissões (acesso total) — atualizar as de um owner é no-op de efeito.
 */
@Injectable()
export class UpdateMemberPermissionsUseCase {
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
    permissions: string[],
  ): Promise<MemberEntity> {
    const isOwner = await this.householdRepo.isOwner(householdId, authId);
    if (!isOwner) throw new HouseholdForbiddenException();

    const member = await this.memberRepo.findByMemberId(memberId, householdId);
    if (!member) throw new MemberNotFoundException(memberId);

    // Normaliza: só chaves válidas e sem duplicatas; preserva a ordem canônica.
    const valid = MODULE_KEYS.filter(
      (m) => permissions.includes(m) && isModuleKey(m),
    );

    const updated = await this.memberRepo.updatePermissions(memberId, [...valid]);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "update",
      entityType: "org_membership",
      entityId: memberId,
      metadata: { memberId, permissions: valid },
    });

    return updated;
  }
}
