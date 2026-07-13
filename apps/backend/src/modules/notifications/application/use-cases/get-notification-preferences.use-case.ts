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
import {
  DEFAULT_CHANNEL_ENABLED,
  PREFERENCE_EVENT_TYPES,
} from "../../domain/notification-events";

export interface NotificationPreferenceMatrixItem {
  eventType: NotificationType;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

/**
 * Matriz completa (todos os eventos configuráveis × canais) com defaults já
 * resolvidos — o que a UI (Account) precisa para renderizar sem lógica extra.
 */
@Injectable()
export class GetNotificationPreferencesUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: INotificationRepository,
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly preferences: INotificationPreferenceRepository,
  ) {}

  async execute(authId: string): Promise<NotificationPreferenceMatrixItem[]> {
    const userId = await this.notifications.findUserIdByAuthId(authId);
    if (!userId) {
      return PREFERENCE_EVENT_TYPES.map((eventType) => ({
        eventType,
        ...DEFAULT_CHANNEL_ENABLED,
      }));
    }

    const rows = await this.preferences.findAllByUser(userId);

    return PREFERENCE_EVENT_TYPES.map((eventType) => {
      const resolved: Record<NotificationChannel, boolean> = { ...DEFAULT_CHANNEL_ENABLED };
      for (const row of rows) {
        if (row.eventType === eventType) resolved[row.channel] = row.enabled;
      }
      return { eventType, ...resolved };
    });
  }
}
