import { Inject, Injectable } from "@nestjs/common";
import type { NotificationChannel } from "../../domain/notification-preference.entity";
import type { NotificationType } from "../../domain/notification.entity";
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from "../../domain/notification.repository.interface";
import {
  INotificationPreferenceRepository,
  NOTIFICATION_PREFERENCE_REPOSITORY,
} from "../../domain/notification-preference.repository.interface";
import { UserNotFoundException } from "../../../user/domain/exceptions/user-not-found.exception";

/** Upsert de uma célula da matriz (eventType×channel) — validação de que
 * eventType/channel são valores conhecidos já ocorre no DTO (ValidationPipe). */
@Injectable()
export class UpdateNotificationPreferenceUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: INotificationRepository,
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly preferences: INotificationPreferenceRepository,
  ) {}

  async execute(
    authId: string,
    eventType: NotificationType,
    channel: NotificationChannel,
    enabled: boolean,
  ): Promise<void> {
    const userId = await this.notifications.findUserIdByAuthId(authId);
    if (!userId) throw new UserNotFoundException(authId);
    await this.preferences.upsert(userId, eventType, channel, enabled);
  }
}
