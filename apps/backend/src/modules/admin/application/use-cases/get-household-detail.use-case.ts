import { Inject, Injectable } from "@nestjs/common";
import {
  AdminHouseholdDetail,
  ADMIN_REPOSITORY,
  IAdminRepository,
} from "../../domain/admin.repository.interface";
import { PlatformTargetNotFoundException } from "../../domain/exceptions/platform-admin.exceptions";

@Injectable()
export class GetHouseholdDetailUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
  ) {}

  async execute(householdId: string): Promise<AdminHouseholdDetail> {
    const detail = await this.adminRepo.getHouseholdDetail(householdId);
    if (!detail) throw new PlatformTargetNotFoundException(`household ${householdId}`);
    return detail;
  }
}
