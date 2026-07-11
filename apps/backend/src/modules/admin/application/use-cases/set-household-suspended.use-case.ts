import { Inject, Injectable } from "@nestjs/common";
import {
  ADMIN_REPOSITORY,
  IAdminRepository,
} from "../../domain/admin.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import { PlatformTargetNotFoundException } from "../../domain/exceptions/platform-admin.exceptions";

@Injectable()
export class SetHouseholdSuspendedUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    householdId: string,
    suspended: boolean,
    actorAuthId: string,
  ): Promise<void> {
    const ok = await this.adminRepo.setHouseholdSuspended(householdId, suspended);
    if (!ok) throw new PlatformTargetNotFoundException(`household ${householdId}`);

    await this.auditService.logByAuthId(actorAuthId, {
      householdId,
      action: "update",
      entityType: "household",
      entityId: householdId,
      metadata: { operation: suspended ? "suspend" : "unsuspend" },
    });
  }
}
