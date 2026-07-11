import type { NotificationType } from "./notification.entity";

export const NOTIFICATION_DEDUP_REPOSITORY = Symbol("NOTIFICATION_DEDUP_REPOSITORY");

export interface INotificationDedupRepository {
  /**
   * Tenta reivindicar o disparo de `eventType` para `contextId`/`periodKey`
   * (INSERT ... ON CONFLICT DO NOTHING sobre a unique de
   * `notification_dedup`). Retorna `true` se reivindicou (ninguém disparou
   * ainda — pode notificar) ou `false` se já havia sido disparado (pular).
   * Atômico mesmo sob concorrência (ticks de cron paralelos).
   */
  tryClaim(
    householdId: string,
    eventType: NotificationType,
    contextId: string,
    periodKey: string,
  ): Promise<boolean>;
}
