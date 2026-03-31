import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface BillReminderEmailProps {
  billName?: string
  /** Valor já formatado em BRL, ex: "R$ 150,00" */
  amountFormatted?: string
  dueDay?: number
  /** 0 = hoje, 1 = amanhã, N = em N dias */
  daysUntil?: number
  appUrl?: string
}

export function BillReminderEmail({
  billName = 'Aluguel',
  amountFormatted = 'R$ 1.200,00',
  dueDay = 5,
  daysUntil = 3,
  appUrl = 'https://larmony.app',
}: BillReminderEmailProps) {
  const daysLabel =
    daysUntil === 0 ? 'hoje' : daysUntil === 1 ? 'amanhã' : `em ${daysUntil} dias`

  const urgencyColor =
    daysUntil === 0 ? '#ef4444' : daysUntil === 1 ? '#f97316' : '#5DCAA5'

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>
        Lembrete: {billName} vence {daysLabel}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={headerText}>larmony</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading as="h1" style={heading}>
              Lembrete de conta a pagar
            </Heading>
            <Text style={paragraph}>
              A conta <strong>{billName}</strong> vence{' '}
              <strong style={{ color: urgencyColor }}>{daysLabel}</strong>.
            </Text>

            {/* Info table */}
            <Section style={infoBox}>
              <Row style={infoRow}>
                <Column style={infoLabel}>Conta</Column>
                <Column style={infoValue}>{billName}</Column>
              </Row>
              <Row style={infoRow}>
                <Column style={infoLabel}>Valor</Column>
                <Column style={{ ...infoValue, fontWeight: '700' }}>{amountFormatted}</Column>
              </Row>
              <Row style={infoRow}>
                <Column style={infoLabel}>Vencimento</Column>
                <Column style={infoValue}>
                  dia {dueDay} de cada mês
                </Column>
              </Row>
              <Row>
                <Column style={infoLabel}>Quando</Column>
                <Column style={{ ...infoValue, color: urgencyColor, fontWeight: '600' }}>
                  {daysLabel}
                </Column>
              </Row>
            </Section>

            <Button href={`${appUrl}/bills`} style={button}>
              Ver contas a pagar
            </Button>
          </Section>

          {/* Footer */}
          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>
              Você recebe este lembrete porque configurou alertas para esta conta no Larmony.
            </Text>
            <Text style={footerDisclaimer}>Larmony · Planejamento financeiro do seu lar</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default BillReminderEmail

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

const infoBox: React.CSSProperties = {
  backgroundColor: '#f8f8f9',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '0 0 24px',
}

const infoRow: React.CSSProperties = {
  marginBottom: '10px',
}

const infoLabel: React.CSSProperties = {
  color: '#71717a',
  fontSize: '13px',
  width: '110px',
  verticalAlign: 'middle',
}

const infoValue: React.CSSProperties = {
  color: '#18181b',
  fontSize: '14px',
  verticalAlign: 'middle',
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

const footerDisclaimer: React.CSSProperties = {
  color: '#d4d4d8',
  fontSize: '11px',
  margin: '8px 0 0',
}
