import { Inject, Injectable } from "@nestjs/common";
import {
  AdminHouseholdRow,
  ADMIN_REPOSITORY,
  IAdminRepository,
  ListHouseholdsFilter,
  Page,
} from "../../domain/admin.repository.interface";

@Injectable()
export class ListPlatformHouseholdsUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
  ) {}

  execute(filter: ListHouseholdsFilter): Promise<Page<AdminHouseholdRow>> {
    return this.adminRepo.listHouseholds(filter);
  }
}
