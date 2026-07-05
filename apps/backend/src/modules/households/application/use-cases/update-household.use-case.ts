import { Inject, Injectable } from "@nestjs/common";
import type { HouseholdEntity } from "../../domain/household.entity";
import {
  IHouseholdRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/household.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import { HouseholdForbiddenException } from "../../domain/exceptions/household-forbidden.exception";
import { HouseholdNotFoundException } from "../../domain/exceptions/household-not-found.exception";

@Injectable()
export class UpdateHouseholdUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly householdRepo: IHouseholdRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    householdId: string,
    authId: string,
    data: { name?: string },
  ): Promise<HouseholdEntity> {
    const household = await this.householdRepo.findByIdAndAuthId(householdId, authId);
    if (!household) throw new HouseholdNotFoundException(householdId);

    const isOwner = await this.householdRepo.isOwner(householdId, authId);
    if (!isOwner) throw new HouseholdForbiddenException();

    const updated = await this.householdRepo.update(householdId, data);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "update",
      entityType: "household",
      entityId: householdId,
      metadata: { fields: Object.keys(data) },
    });

    return updated;
  }
}
