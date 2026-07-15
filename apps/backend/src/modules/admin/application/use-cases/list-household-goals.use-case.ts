import { Inject, Injectable } from "@nestjs/common";
import {
  AdminGoalRow,
  ADMIN_REPOSITORY,
  IAdminRepository,
  Page,
  PageFilter,
} from "../../domain/admin.repository.interface";
import { PlatformTargetNotFoundException } from "../../domain/exceptions/platform-admin.exceptions";

@Injectable()
export class ListHouseholdGoalsUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
  ) {}

  async execute(householdId: string, filter: PageFilter): Promise<Page<AdminGoalRow>> {
    if (!(await this.adminRepo.householdExists(householdId))) {
      throw new PlatformTargetNotFoundException(`household ${householdId}`);
    }
    return this.adminRepo.listHouseholdGoals(householdId, filter);
  }
}
