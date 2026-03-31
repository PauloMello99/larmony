import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface ChangeEmailEmailProps {
  newEmail?: string
  confirmationUrl?: string
}

export function ChangeEmailEmail({
  newEmail = 'novo@exemplo.com',
  confirmationUrl = 'https://larmony.app/auth/confirm-email-change?token=preview',
}: ChangeEmailEmailProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Confirme seu novo endereço de e-mail no Larmony</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={headerText}>larmony</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading as="h1" style={heading}>
              Confirme seu novo e-mail
            </Heading>
            <Text style={paragraph}>
              Você solicitou a alteração do endereço de e-mail da sua conta no Larmony para{' '}
              <strong>{newEmail}</strong>. Clique no botão abaixo para confirmar a mudança.
            </Text>
            <Button href={confirmationUrl} style={button}>
              Confirmar novo e-mail
            </Button>
            <Text style={hint}>
              Se você não solicitou esta alteração, ignore este e-mail — sua conta permanece
              inalterada.
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>
              Se o botão não funcionar, copie e cole este link no navegador:
            </Text>
            <Link href={confirmationUrl} style={footerLink}>
              {confirmationUrl}
            </Link>
            <Text style={footerDisclaimer}>Larmony · Planejamento financeiro do seu lar</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default ChangeEmailEmail

// ── Styles ──────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: '#f4f4f5',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  margin: 0,
  padding: '40px 0',
}

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  boxShadow: '0 1px 4px rgba(0,0,0,.08)',
  maxWidth: '520px',
  margin: '0 auto',
  overflow: 'hidden',
}

const header: React.CSSProperties = {
  backgroundColor: '#0F1923',
  padding: '28px 32px',
}

const headerText: React.CSSProperties = {
  color: '#9FE1CB',
  fontSize: '22px',
  fontWeight: '600',
  letterSpacing: '0.5px',
  fontFamily: "Georgia, 'Times New Roman', serif",
  margin: 0,
}

const content: React.CSSProperties = {
  padding: '36px 32px 24px',
}

const heading: React.CSSProperties = {
  color: '#18181b',
  fontSize: '22px',
  fontWeight: '700',
  margin: '0 0 12px',
}

const paragraph: React.CSSProperties = {
  color: '#52525b',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 24px',
}

const button: React.CSSProperties = {
  backgroundColor: '#0F1923',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '600',
  padding: '13px 28px',
  textDecoration: 'none',
}

const hint: React.CSSProperties = {
  color: '#a1a1aa',
  fontSize: '13px',
  margin: '20px 0 0',
}

const divider: React.CSSProperties = {
  borderColor: '#e4e4e7',
  margin: '0 32px',
}

const footer: React.CSSProperties = {
  padding: '16px 32px 28px',
}

const footerText: React.CSSProperties = {
  color: '#a1a1aa',
  fontSize: '12px',
  margin: '0 0 4px',
}

const footerLink: React.CSSProperties = {
  color: '#71717a',
  fontSize: '12px',
  wordBreak: 'break-all',
}

const footerDisclaimer: React.CSSProperties = {
  color: '#d4d4d8',
  fontSize: '11px',
  margin: '16px 0 0',
}
