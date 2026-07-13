import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout, sharedStyles } from "./base-layout";
import { mailMessages } from "../i18n/mail-messages";

export interface NotificationEmailProps {
  title: string;
  body?: string | null;
  /** CTA opcional (ex.: link para lançamentos / orçamentos). */
  actionUrl?: string;
  actionLabel?: string;
  /** Locale do destinatário (ADR-0018) — title/body já chegam renderizados
   * pelo catálogo de notificações; aqui localiza o chrome (layout + CTA default). */
  locale?: string | null;
}

/**
 * Template genérico usado por todas as notificações disparadas pelo
 * NotificationService (metas, orçamentos, lançamentos, relatório mensal).
 */
export function NotificationEmail({
  title,
  body,
  actionUrl,
  actionLabel,
  locale,
}: NotificationEmailProps) {
  const m = mailMessages(locale);
  return (
    <BaseLayout preview={title} locale={locale}>
      <Heading style={sharedStyles.heading}>{title}</Heading>
      {body ? <Text style={sharedStyles.paragraph}>{body}</Text> : null}
      {actionUrl ? (
        <Section style={{ textAlign: "center", margin: "24px 0" }}>
          <Button href={actionUrl} style={sharedStyles.button}>
            {actionLabel ?? m.notification.defaultActionLabel}
          </Button>
        </Section>
      ) : null}
    </BaseLayout>
  );
}

// Default export para a preview do `react-email` (email dev).
export default function NotificationEmailPreview() {
  return (
    <NotificationEmail
      title="Orçamento de Lazer estourado"
      body="Gasto de R$ 290,33 superou o limite de R$ 250,00."
      actionUrl="https://app.larmony.me/households"
      actionLabel="Ver orçamentos"
    />
  );
}
