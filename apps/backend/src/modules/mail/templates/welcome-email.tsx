import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout, sharedStyles } from "./base-layout";
import { mailMessages } from "../i18n/mail-messages";

export interface WelcomeEmailProps {
  name: string;
  /** Link de acesso ao app (opcional). */
  appUrl?: string;
  /** Locale do destinatário (ADR-0018). Default pt-BR. */
  locale?: string | null;
}

export function WelcomeEmail({ name, appUrl, locale }: WelcomeEmailProps) {
  const m = mailMessages(locale);
  return (
    <BaseLayout preview={m.welcome.preview} locale={locale}>
      <Heading style={sharedStyles.heading}>{m.welcome.heading(name)}</Heading>
      <Text style={sharedStyles.paragraph}>{m.welcome.body}</Text>
      {appUrl ? (
        <Section style={{ textAlign: "center", margin: "24px 0" }}>
          <Button href={appUrl} style={sharedStyles.button}>
            {m.welcome.cta}
          </Button>
        </Section>
      ) : null}
      <Text style={sharedStyles.muted}>{m.welcome.footNote}</Text>
    </BaseLayout>
  );
}

// Default export para a preview do `react-email` (email dev).
export default function WelcomeEmailPreview() {
  return <WelcomeEmail name="Paulo" appUrl="https://app.larmony.me" />;
}
