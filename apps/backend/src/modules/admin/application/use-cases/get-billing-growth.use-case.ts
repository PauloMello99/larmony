import { Inject, Injectable } from "@nestjs/common";
import {
  ADMIN_REPOSITORY,
  BillingGrowthPoint,
  IAdminRepository,
} from "../../domain/admin.repository.interface";

@Injectable()
export class GetBillingGrowthUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
  ) {}

  execute(): Promise<BillingGrowthPoint[]> {
    return this.adminRepo.getBillingGrowthSeries();
  }
}
