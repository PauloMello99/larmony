import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout, sharedStyles } from "./base-layout";
import { mailMessages } from "../i18n/mail-messages";

export interface PasswordResetEmailProps {
  /** Nome do usuário (opcional — saudação personalizada). */
  name?: string;
  resetUrl: string;
  /** Locale do destinatário (ADR-0018). Default pt-BR. */
  locale?: string | null;
}

export function PasswordResetEmail({ name, resetUrl, locale }: PasswordResetEmailProps) {
  const m = mailMessages(locale);
  return (
    <BaseLayout preview={m.passwordReset.preview} locale={locale}>
      <Heading style={sharedStyles.heading}>{m.passwordReset.heading}</Heading>
      <Text style={sharedStyles.paragraph}>
        {m.passwordReset.greeting(name)}
        {m.passwordReset.body}
      </Text>
      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button href={resetUrl} style={sharedStyles.button}>
          {m.passwordReset.cta}
        </Button>
      </Section>
      <Text style={sharedStyles.muted}>
        {m.copyLink}
        <br />
        <span style={sharedStyles.link}>{resetUrl}</span>
      </Text>
      <Text style={sharedStyles.muted}>{m.passwordReset.ignoreNote}</Text>
    </BaseLayout>
  );
}

// Default export para a preview do `react-email` (email dev).
export default function PasswordResetEmailPreview() {
  return (
    <PasswordResetEmail
      name="Paulo"
      resetUrl="https://app.larmony.me/auth/reset-password#access_token=preview"
    />
  );
}
