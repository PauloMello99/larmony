import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE_ADMIN, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type { NotificationType } from "../../domain/notification.entity";
import type { INotificationDedupRepository } from "../../domain/notification-dedup.repository.interface";

@Injectable()
export class DrizzleNotificationDedupRepository
  implements INotificationDedupRepository
{
  // Sem RLS/GRANT nesta tabela de propósito (ver migration 0007) — sempre admin.
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async tryClaim(
    householdId: string,
    eventType: NotificationType,
    contextId: string,
    periodKey: string,
  ): Promise<boolean> {
    const rows = await this.db
      .insert(schema.notificationDedup)
      .values({ householdId, eventType, contextId, periodKey })
      .onConflictDoNothing()
      .returning({ id: schema.notificationDedup.id });

    return rows.length > 0;
  }
}
