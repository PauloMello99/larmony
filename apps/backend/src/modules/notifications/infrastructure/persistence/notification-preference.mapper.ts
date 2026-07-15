import type { NotificationPreference as NotificationPreferenceRow } from "../../../../database/schema/notification-preferences";
import { NotificationPreferenceEntity } from "../../domain/notification-preference.entity";

export class NotificationPreferenceMapper {
  static toDomain(row: NotificationPreferenceRow): NotificationPreferenceEntity {
    return NotificationPreferenceEntity.create({
      id: row.id,
      userId: row.userId,
      eventType: row.eventType,
      channel: row.channel,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
