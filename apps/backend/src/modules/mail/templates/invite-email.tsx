import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout, sharedStyles } from "./base-layout";
import { mailMessages } from "../i18n/mail-messages";

export interface InviteEmailProps {
  householdName: string;
  acceptUrl: string;
  /**
   * Locale do e-mail (ADR-0018). O convidado ainda não tem conta, então o
   * idioma usado é o do REMETENTE (owner que convidou). Default pt-BR.
   */
  locale?: string | null;
}

export function InviteEmail({ householdName, acceptUrl, locale }: InviteEmailProps) {
  const m = mailMessages(locale);
  return (
    <BaseLayout preview={m.invite.preview(householdName)} locale={locale}>
      <Heading style={sharedStyles.heading}>{m.invite.heading}</Heading>
      <Text style={sharedStyles.paragraph}>
        {m.invite.bodyBefore}
        <strong>{householdName}</strong>
        {m.invite.bodyAfter}
      </Text>
      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button href={acceptUrl} style={sharedStyles.button}>
          {m.invite.cta}
        </Button>
      </Section>
      <Text style={sharedStyles.muted}>
        {m.copyLink}
        <br />
        <span style={sharedStyles.link}>{acceptUrl}</span>
      </Text>
      <Text style={sharedStyles.muted}>{m.invite.expires}</Text>
    </BaseLayout>
  );
}

// Default export para a preview do `react-email` (email dev).
export default function InviteEmailPreview() {
  return (
    <InviteEmail
      householdName="Casa da Helena"
      acceptUrl="https://app.larmony.me/invite/accept?token=preview-token"
    />
  );
}
