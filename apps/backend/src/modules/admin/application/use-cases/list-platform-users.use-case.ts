import { Inject, Injectable } from "@nestjs/common";
import {
  AdminUserRow,
  ADMIN_REPOSITORY,
  IAdminRepository,
  ListUsersFilter,
  Page,
} from "../../domain/admin.repository.interface";

@Injectable()
export class ListPlatformUsersUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
  ) {}

  execute(filter: ListUsersFilter): Promise<Page<AdminUserRow>> {
    return this.adminRepo.listUsers(filter);
  }
}
