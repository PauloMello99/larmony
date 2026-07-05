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
import { MODULE_KEYS } from "../../domain/member-permissions";
import { HouseholdForbiddenException } from "../../domain/exceptions/household-forbidden.exception";
import { MemberNotFoundException } from "../../domain/exceptions/member-not-found.exception";
import { MemberInactiveException } from "../../domain/exceptions/member-inactive.exception";

@Injectable()
export class TransferOwnershipUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly householdRepo: IHouseholdRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    householdId: string,
    newOwnerMemberId: string,
    authId: string,
  ): Promise<void> {
    const isOwner = await this.householdRepo.isOwner(householdId, authId);
    if (!isOwner) throw new HouseholdForbiddenException();

    const currentOwner = await this.memberRepo.findByAuthId(householdId, authId);
    if (!currentOwner) throw new HouseholdForbiddenException();

    // super_admin não-membro tem memberId vazio (sintetizado): nesse caso o
    // "dono atual" a rebaixar é o owner real da household, não o ator.
    let currentOwnerMemberId = currentOwner.memberId;
    if (currentOwnerMemberId === "") {
      const members = await this.memberRepo.findAllByHousehold(householdId);
      currentOwnerMemberId =
        members.find((m) => m.role === "owner" && m.enabled)?.memberId ?? "";
    }

    // Transferir para quem já é o dono é no-op.
    if (currentOwnerMemberId === newOwnerMemberId) return;

    const newOwner = await this.memberRepo.findByMemberId(
      newOwnerMemberId,
      householdId,
    );
    if (!newOwner) throw new MemberNotFoundException(newOwnerMemberId);
    if (!newOwner.enabled) throw new MemberInactiveException();

    // O antigo dono vira funcionário com acesso total (não perde os módulos).
    // currentOwnerMemberId vazio (sem owner real) → o update de rebaixamento é
    // no-op e apenas promovemos o novo dono.
    await this.memberRepo.transferOwnership(
      householdId,
      newOwnerMemberId,
      currentOwnerMemberId,
      [...MODULE_KEYS],
    );

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "update",
      entityType: "household",
      entityId: householdId,
      metadata: {
        from: currentOwnerMemberId,
        to: newOwnerMemberId,
        operation: "transfer_ownership",
      },
    });
  }
}
