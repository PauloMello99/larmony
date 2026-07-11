import { IsBoolean, IsIn } from "class-validator";
import type { NotificationChannel } from "../../domain/notification-preference.entity";
import type { NotificationType } from "../../domain/notification.entity";
import { PREFERENCE_EVENT_TYPES } from "../../domain/notification-events";

const CHANNELS: NotificationChannel[] = ["email", "sms", "whatsapp"];

/** Upsert de uma célula da matriz — sem eventos/canais fora do configurável (in-app nunca entra). */
export class UpdateNotificationPreferenceDto {
  @IsIn(PREFERENCE_EVENT_TYPES)
  eventType!: NotificationType;

  @IsIn(CHANNELS)
  channel!: NotificationChannel;

  @IsBoolean()
  enabled!: boolean;
}
