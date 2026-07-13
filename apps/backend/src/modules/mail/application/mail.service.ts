import { Inject, Injectable } from "@nestjs/common";
import { render } from "@react-email/render";
import type { ReactElement } from "react";
import {
  EMAIL_SENDER,
  IEmailSender,
} from "../domain/ports/email-sender.port";
import { mailMessages } from "../i18n/mail-messages";
import { InviteEmail } from "../templates/invite-email";
import { NotificationEmail } from "../templates/notification-email";
import { PasswordResetEmail } from "../templates/password-reset-email";
import { WelcomeEmail } from "../templates/welcome-email";

export interface SendHouseholdInviteInput {
  to: string;
  householdName: string;
  acceptUrl: string;
  /** Locale do e-mail — o convidado não tem conta; usa-se o do remetente. */
  locale?: string | null;
}

export interface SendPasswordResetInput {
  to: string;
  name?: string;
  resetUrl: string;
  /** Locale do destinatário (`users.locale`). */
  locale?: string | null;
}

export interface SendWelcomeInput {
  to: string;
  name: string;
  appUrl?: string;
  /** Locale do destinatário (`users.locale`). */
  locale?: string | null;
}

export interface SendNotificationInput {
  to: string;
  title: string;
  body?: string | null;
  actionUrl?: string;
  actionLabel?: string;
  /** Locale do destinatário — title/body já vêm renderizados; localiza o chrome. */
  locale?: string | null;
}

/**
 * Camada de aplicação de e-mail: renderiza os templates React Email (no idioma
 * do destinatário — catálogo `mail-messages.ts`, ADR-0018) e delega o envio ao
 * IEmailSender. Os métodos **propagam** falha real de envio — cabe ao caller
 * decidir se é crítico (aborta o fluxo) ou best-effort (try/catch). Retornam
 * `false` quando o canal está desabilitado (no-op em dev).
 */
@Injectable()
export class MailService {
  constructor(
    @Inject(EMAIL_SENDER) private readonly sender: IEmailSender,
  ) {}

  async sendHouseholdInvite(input: SendHouseholdInviteInput): Promise<boolean> {
    const m = mailMessages(input.locale);
    return this.dispatch(
      input.to,
      m.invite.subject(input.householdName),
      InviteEmail({
        householdName: input.householdName,
        acceptUrl: input.acceptUrl,
        locale: input.locale,
      }),
    );
  }

  async sendPasswordReset(input: SendPasswordResetInput): Promise<boolean> {
    const m = mailMessages(input.locale);
    return this.dispatch(
      input.to,
      m.passwordReset.subject,
      PasswordResetEmail({ name: input.name, resetUrl: input.resetUrl, locale: input.locale }),
    );
  }

  async sendWelcome(input: SendWelcomeInput): Promise<boolean> {
    const m = mailMessages(input.locale);
    return this.dispatch(
      input.to,
      m.welcome.subject,
      WelcomeEmail({ name: input.name, appUrl: input.appUrl, locale: input.locale }),
    );
  }

  async sendNotification(input: SendNotificationInput): Promise<boolean> {
    return this.dispatch(
      input.to,
      input.title,
      NotificationEmail({
        title: input.title,
        body: input.body,
        actionUrl: input.actionUrl,
        actionLabel: input.actionLabel,
        locale: input.locale,
      }),
    );
  }

  private async dispatch(
    to: string,
    subject: string,
    element: ReactElement,
  ): Promise<boolean> {
    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);
    return this.sender.send({ to, subject, html, text });
  }
}
