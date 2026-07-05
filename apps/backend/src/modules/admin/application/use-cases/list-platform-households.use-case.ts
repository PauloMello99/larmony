import { Inject, Injectable } from "@nestjs/common";
import {
  AdminHouseholdRow,
  ADMIN_REPOSITORY,
  IAdminRepository,
} from "../../domain/admin.repository.interface";

@Injectable()
export class ListPlatformHouseholdsUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
  ) {}

  execute(): Promise<AdminHouseholdRow[]> {
    return this.adminRepo.listHouseholds();
  }
}
