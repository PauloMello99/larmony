import { Inject, Injectable } from "@nestjs/common";
import {
  IHouseholdRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/household.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import { HouseholdForbiddenException } from "../../domain/exceptions/household-forbidden.exception";
import { HouseholdNotFoundException } from "../../domain/exceptions/household-not-found.exception";

@Injectable()
export class DeleteHouseholdUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly householdRepo: IHouseholdRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(householdId: string, authId: string): Promise<void> {
    const household = await this.householdRepo.findByIdAndAuthId(householdId, authId);
    if (!household) throw new HouseholdNotFoundException(householdId);

    const isOwner = await this.householdRepo.isOwner(householdId, authId);
    if (!isOwner) throw new HouseholdForbiddenException();

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "delete",
      entityType: "household",
      entityId: householdId,
      metadata: { name: household.name, slug: household.slug },
    });

    await this.householdRepo.delete(householdId);
  }
}
