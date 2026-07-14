import { Inject, Injectable } from "@nestjs/common";
import {
  AdminBudgetRow,
  ADMIN_REPOSITORY,
  IAdminRepository,
  Page,
  PageFilter,
} from "../../domain/admin.repository.interface";
import { PlatformTargetNotFoundException } from "../../domain/exceptions/platform-admin.exceptions";

@Injectable()
export class ListHouseholdBudgetsUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
  ) {}

  async execute(householdId: string, filter: PageFilter): Promise<Page<AdminBudgetRow>> {
    if (!(await this.adminRepo.householdExists(householdId))) {
      throw new PlatformTargetNotFoundException(`household ${householdId}`);
    }
    return this.adminRepo.listHouseholdBudgets(householdId, filter);
  }
}
