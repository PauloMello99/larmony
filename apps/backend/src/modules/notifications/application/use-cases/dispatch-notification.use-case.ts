import { Inject, Injectable, Logger } from "@nestjs/common";
import { MailService } from "../../../mail/application/mail.service";
import type { NotificationType } from "../../domain/notification.entity";
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from "../../domain/notification.repository.interface";
import {
  INotificationPreferenceRepository,
  NOTIFICATION_PREFERENCE_REPOSITORY,
} from "../../domain/notification-preference.repository.interface";
import { ISmsSender, SMS_SENDER } from "../../domain/ports/sms-sender.port";
import { IWhatsAppSender, WHATSAPP_SENDER } from "../../domain/ports/whatsapp-sender.port";

export interface DispatchNotificationInput {
  /** Destinatários (o chamador já resolveu QUEM — ex.: membros do lar). */
  recipientUserIds: string[];
  householdId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
  /** CTA opcional nos canais assíncronos (e-mail/SMS/WhatsApp). */
  actionUrl?: string;
  actionLabel?: string;
}

/**
 * Ponto único de entrada de notificações (M11). Por destinatário: (1) grava a
 * linha in-app (sempre — fonte da verdade, nunca gateada por preferência);
 * (2) resolve os canais habilitados via `INotificationPreferenceRepository`
 * (default: e-mail on, sms/whatsapp off); (3) fan-out via ports com
 * `allSettled` — falha de um canal (ou de um destinatário) nunca bloqueia os
 * demais. Substitui o antigo `NotificationService.notify()` (e-mail estava
 * acoplado inline, sem preferência).
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
    await this.notifications.create({
      userId,
      householdId: input.householdId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      data: input.data ?? null,
    });

    const channels = await this.preferences.resolveForUser(userId, input.type);

    const results = await Promise.allSettled([
      this.sendEmail(userId, channels.email, input),
      this.sendSms(userId, channels.sms, input),
      this.sendWhatsApp(userId, channels.whatsapp, input),
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
    userId: string,
    enabled: boolean,
    input: DispatchNotificationInput,
  ): Promise<void> {
    if (!enabled) return;
    const contact = await this.notifications.findUserContact(userId);
    if (!contact?.email) return;
    await this.mail.sendNotification({
      to: contact.email,
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl,
      actionLabel: input.actionLabel,
    });
  }

  private async sendSms(
    userId: string,
    enabled: boolean,
    input: DispatchNotificationInput,
  ): Promise<void> {
    if (!enabled) return;
    // Sem telefone (edição/verificação fora do M11 — ver UserContact.phone) →
    // no-op estrutural; nunca chega a chamar o port sem destino.
    const contact = await this.notifications.findUserContact(userId);
    if (!contact?.phone) return;
    await this.sms.send({ to: contact.phone, body: input.title });
  }

  private async sendWhatsApp(
    userId: string,
    enabled: boolean,
    input: DispatchNotificationInput,
  ): Promise<void> {
    if (!enabled) return;
    const contact = await this.notifications.findUserContact(userId);
    if (!contact?.phone) return;
    await this.whatsapp.send({ to: contact.phone, body: input.title });
  }
}
