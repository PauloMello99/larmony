import { Inject, Injectable, Logger } from "@nestjs/common";
import { MailService } from "../../../mail/application/mail.service";
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
  type UserContact,
} from "../../domain/notification.repository.interface";
import {
  INotificationPreferenceRepository,
  NOTIFICATION_PREFERENCE_REPOSITORY,
} from "../../domain/notification-preference.repository.interface";
import { ISmsSender, SMS_SENDER } from "../../domain/ports/sms-sender.port";
import { IWhatsAppSender, WHATSAPP_SENDER } from "../../domain/ports/whatsapp-sender.port";
import {
  renderNotification,
  type NotificationParams,
  type RenderedNotification,
} from "../i18n/notification-messages";

/**
 * Entrada do dispatcher. `type` + os params ficam correlacionados pela união
 * discriminada `NotificationParams`, então cada call site é checado pelo
 * compilador. O texto NÃO vem pronto — é renderizado por destinatário no idioma
 * do perfil (`users.locale`). `actionUrl` (URL, não se traduz) e `data` (jsonb
 * p/ deep-link do frontend) seguem opcionais.
 */
export type DispatchNotificationInput = NotificationParams & {
  /** Destinatários (o chamador já resolveu QUEM — ex.: membros do lar). */
  recipientUserIds: string[];
  householdId?: string | null;
  data?: Record<string, unknown> | null;
  /** CTA opcional nos canais assíncronos (e-mail/SMS/WhatsApp). */
  actionUrl?: string;
};

/**
 * Ponto único de entrada de notificações (M11). Por destinatário: (1) renderiza
 * o texto no idioma do perfil (render-at-send, ADR-0023); (2) grava a linha
 * in-app (sempre — fonte da verdade, nunca gateada por preferência); (3) resolve
 * os canais habilitados (default: e-mail on, sms/whatsapp off); (4) fan-out via
 * ports com `allSettled` — falha de um canal (ou destinatário) nunca bloqueia os
 * demais.
 */
@Injectable()
export class DispatchNotificationUseCase {
  private readonly logger = new Logger(DispatchNotificationUseCase.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: INotificationRepository,
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly preferences: INotificationPreferenceRepository,
    private readonly mail: MailService,
    @Inject(SMS_SENDER) private readonly sms: ISmsSender,
    @Inject(WHATSAPP_SENDER) private readonly whatsapp: IWhatsAppSender,
  ) {}

  async execute(input: DispatchNotificationInput): Promise<void> {
    await Promise.allSettled(
      input.recipientUserIds.map((userId) => this.dispatchToOne(userId, input)),
    );
  }

  private async dispatchToOne(
    userId: string,
    input: DispatchNotificationInput,
  ): Promise<void> {
    // Contato + locale buscados UMA vez (não por canal). Sem contato, ainda
    // gravamos o in-app no idioma default — a linha in-app é a fonte da verdade.
    const contact = await this.notifications.findUserContact(userId);
    const content = renderNotification(input, contact?.locale);

    await this.notifications.create({
      userId,
      householdId: input.householdId ?? null,
      type: input.type,
      title: content.title,
      body: content.body,
      data: input.data ?? null,
    });

    const channels = await this.preferences.resolveForUser(userId, input.type);

    const results = await Promise.allSettled([
      this.sendEmail(channels.email, contact, content, input.actionUrl),
      this.sendSms(channels.sms, contact, content),
      this.sendWhatsApp(channels.whatsapp, contact, content),
    ]);

    for (const result of results) {
      if (result.status === "rejected") {
        this.logger.warn(
          `Falha ao despachar canal para userId=${userId}, type=${input.type}: ${
            result.reason instanceof Error ? result.reason.message : String(result.reason)
          }`,
        );
      }
    }
  }

  private async sendEmail(
    enabled: boolean,
    contact: UserContact | null,
    content: RenderedNotification,
    actionUrl: string | undefined,
  ): Promise<void> {
    if (!enabled || !contact?.email) return;
    await this.mail.sendNotification({
      to: contact.email,
      title: content.title,
      body: content.body,
      actionUrl,
      actionLabel: content.actionLabel,
      // Chrome do e-mail (layout/CTA default) no idioma do destinatário.
      locale: contact.locale,
    });
  }

  private async sendSms(
    enabled: boolean,
    contact: UserContact | null,
    content: RenderedNotification,
  ): Promise<void> {
    // Sem telefone (edição/verificação fora do M11 — ver UserContact.phone) →
    // no-op estrutural; nunca chega a chamar o port sem destino.
    if (!enabled || !contact?.phone) return;
    await this.sms.send({ to: contact.phone, body: content.title });
  }

  private async sendWhatsApp(
    enabled: boolean,
    contact: UserContact | null,
    content: RenderedNotification,
  ): Promise<void> {
    if (!enabled || !contact?.phone) return;
    await this.whatsapp.send({ to: contact.phone, body: content.title });
  }
}
