import { Inject, Injectable } from "@nestjs/common";
import {
  AdminNotificationRow,
  ADMIN_REPOSITORY,
  IAdminRepository,
  ListHouseholdNotificationsFilter,
  Page,
} from "../../domain/admin.repository.interface";
import { PlatformTargetNotFoundException } from "../../domain/exceptions/platform-admin.exceptions";

@Injectable()
export class ListHouseholdNotificationsUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
  ) {}

  async execute(
    householdId: string,
    filter: ListHouseholdNotificationsFilter,
  ): Promise<Page<AdminNotificationRow>> {
    if (!(await this.adminRepo.householdExists(householdId))) {
      throw new PlatformTargetNotFoundException(`household ${householdId}`);
    }
    return this.adminRepo.listHouseholdNotifications(householdId, filter);
  }
}
