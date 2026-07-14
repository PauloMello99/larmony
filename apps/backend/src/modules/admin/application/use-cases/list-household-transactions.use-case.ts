import { Inject, Injectable } from "@nestjs/common";
import {
  AdminTransactionRow,
  ADMIN_REPOSITORY,
  IAdminRepository,
  ListHouseholdTransactionsFilter,
  Page,
} from "../../domain/admin.repository.interface";
import { PlatformTargetNotFoundException } from "../../domain/exceptions/platform-admin.exceptions";

@Injectable()
export class ListHouseholdTransactionsUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
  ) {}

  async execute(
    householdId: string,
    filter: ListHouseholdTransactionsFilter,
  ): Promise<Page<AdminTransactionRow>> {
    if (!(await this.adminRepo.householdExists(householdId))) {
      throw new PlatformTargetNotFoundException(`household ${householdId}`);
    }
    return this.adminRepo.listHouseholdTransactions(householdId, filter);
  }
}
