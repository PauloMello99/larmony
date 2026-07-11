import type { NotificationType } from "./notification.entity";
import type {
  NotificationChannel,
  NotificationPreferenceEntity,
  ResolvedChannels,
} from "./notification-preference.entity";

export const NOTIFICATION_PREFERENCE_REPOSITORY = Symbol(
  "NOTIFICATION_PREFERENCE_REPOSITORY",
);

export interface INotificationPreferenceRepository {
  /** Linhas explícitas do usuário — só overrides; ausência = default (ver notification-events.ts). */
  findAllByUser(userId: string): Promise<NotificationPreferenceEntity[]>;
  /**
   * Resolve os 3 canais para um (usuário, evento), aplicando defaults onde não
   * há linha. Chamado pelo dispatcher em request E cron context — por isso a
   * implementação nunca depende de RLS (escopa por userId no código, mesma
   * razão de `notifications` usar DRIZZLE_ADMIN).
   */
  resolveForUser(userId: string, eventType: NotificationType): Promise<ResolvedChannels>;
  /** Upsert de uma linha — usado pelo PUT da matriz (Account). */
  upsert(
    userId: string,
    eventType: NotificationType,
    channel: NotificationChannel,
    enabled: boolean,
  ): Promise<NotificationPreferenceEntity>;
}
