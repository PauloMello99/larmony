import { Inject, Injectable } from "@nestjs/common";
import {
  ADMIN_REPOSITORY,
  BillingStats,
  IAdminRepository,
} from "../../domain/admin.repository.interface";

@Injectable()
export class GetBillingStatsUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
  ) {}

  execute(): Promise<BillingStats> {
    return this.adminRepo.getBillingStats();
  }
}
