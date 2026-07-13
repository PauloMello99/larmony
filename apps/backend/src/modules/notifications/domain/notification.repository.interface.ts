import {
  CreateNotificationData,
  NotificationEntity,
} from "./notification.entity";

export const NOTIFICATION_REPOSITORY = Symbol("NOTIFICATION_REPOSITORY");

export interface UserContact {
  id: string;
  name: string;
  email: string;
  /**
   * `null` na prática em todo o M11 — não há UI de edição de telefone nem
   * verificação (fora de escopo); os ports de SMS/WhatsApp usam a ausência
   * como no-op estrutural. Presente para quando a edição/verificação existir.
   */
  phone: string | null;
  /** Locale do perfil (`users.locale`) — o dispatcher renderiza a notificação
   *  neste idioma (fallback pt-BR via `normalizeLocale`). */
  locale: string;
}

export interface INotificationRepository {
  create(data: CreateNotificationData): Promise<NotificationEntity>;
  findByUser(
    userId: string,
    opts?: { unreadOnly?: boolean; limit?: number },
  ): Promise<NotificationEntity[]>;
  countUnread(userId: string): Promise<number>;
  markRead(id: string, userId: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;

  /** Resolve o usuário (users.id) a partir do auth_id (Supabase sub). */
  findUserIdByAuthId(authId: string): Promise<string | null>;
  /** Contato do destinatário (para envio por e-mail). */
  findUserContact(userId: string): Promise<UserContact | null>;
}
