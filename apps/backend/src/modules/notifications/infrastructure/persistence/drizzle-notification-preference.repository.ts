import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE_ADMIN, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type { NotificationType } from "../../domain/notification.entity";
import {
  NotificationChannel,
  NotificationPreferenceEntity,
  ResolvedChannels,
} from "../../domain/notification-preference.entity";
import { DEFAULT_CHANNEL_ENABLED } from "../../domain/notification-events";
import type { INotificationPreferenceRepository } from "../../domain/notification-preference.repository.interface";
import { NotificationPreferenceMapper } from "./notification-preference.mapper";

@Injectable()
export class DrizzleNotificationPreferenceRepository
  implements INotificationPreferenceRepository
{
  // Lida com o dispatcher em request E cron context (ver domain-rules
  // §Notificações) — nunca depende de RLS; escopo por user_id sempre explícito.
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async findAllByUser(userId: string): Promise<NotificationPreferenceEntity[]> {
    const rows = await this.db
      .select()
      .from(schema.notificationPreferences)
      .where(eq(schema.notificationPreferences.userId, userId));
    return rows.map(NotificationPreferenceMapper.toDomain);
  }

  async resolveForUser(
    userId: string,
    eventType: NotificationType,
  ): Promise<ResolvedChannels> {
    const rows = await this.db
      .select({
        channel: schema.notificationPreferences.channel,
        enabled: schema.notificationPreferences.enabled,
      })
      .from(schema.notificationPreferences)
      .where(
        and(
          eq(schema.notificationPreferences.userId, userId),
          eq(schema.notificationPreferences.eventType, eventType),
        ),
      );

    const resolved: ResolvedChannels = { ...DEFAULT_CHANNEL_ENABLED };
    for (const row of rows) resolved[row.channel] = row.enabled;
    return resolved;
  }

  async upsert(
    userId: string,
    eventType: NotificationType,
    channel: NotificationChannel,
    enabled: boolean,
  ): Promise<NotificationPreferenceEntity> {
    const [row] = await this.db
      .insert(schema.notificationPreferences)
      .values({ userId, eventType, channel, enabled })
      .onConflictDoUpdate({
        target: [
          schema.notificationPreferences.userId,
          schema.notificationPreferences.eventType,
          schema.notificationPreferences.channel,
        ],
        set: { enabled, updatedAt: new Date() },
      })
      .returning();

    if (!row) throw new Error("Failed to upsert notification preference");
    return NotificationPreferenceMapper.toDomain(row);
  }
}
