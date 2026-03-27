import cron from 'node-cron'
import { createClient } from '@supabase/supabase-js'

const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM_ADDRESS = 'Home Finances <noreply@homefi.app>'

async function sendEmail(opts: {
  to: string | string[]
  subject: string
  html: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[resend] RESEND_API_KEY not set — skipping email send')
    return
  }

  const recipients = Array.isArray(opts.to) ? opts.to : [opts.to]
  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_ADDRESS, to: recipients, subject: opts.subject, html: opts.html }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend API error ${res.status}: ${body}`)
  }
}

async function sendBillReminders(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[reminders] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const today = new Date()
  const currentDay = today.getUTCDate()
  const currentMonth = today.getUTCMonth()
  const currentYear = today.getUTCFullYear()

  const { data: bills, error: billsError } = await supabase
    .from('bills')
    .select('id, name, amount, due_day, reminder_days_before, reminder_last_sent_at, household_id')
    .eq('is_active', true)
    .not('reminder_days_before', 'is', null)

  if (billsError) {
    console.error('[reminders] Error fetching bills:', billsError)
    return
  }

  if (!bills?.length) {
    console.log('[reminders] No bills with reminders configured.')
    return
  }

  let sent = 0
  let skipped = 0

  for (const bill of bills) {
    let daysUntil = bill.due_day - currentDay
    if (daysUntil < 0) {
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getUTCDate()
      daysUntil = daysInMonth - currentDay + bill.due_day
    }

    if (daysUntil !== bill.reminder_days_before) {
      skipped++
      continue
    }

    if (bill.reminder_last_sent_at) {
      const lastSent = new Date(bill.reminder_last_sent_at)
      if (lastSent.getUTCMonth() === currentMonth && lastSent.getUTCFullYear() === currentYear) {
        skipped++
        continue
      }
    }

    const { data: memberships } = await supabase
      .from('household_memberships')
      .select('user_id')
      .eq('household_id', bill.household_id)

    if (!memberships?.length) {
      skipped++
      continue
    }

    const emailResults = await Promise.all(
      memberships.map((m) => supabase.auth.admin.getUserById(m.user_id))
    )
    const emails = emailResults.map((r) => r.data?.user?.email).filter(Boolean) as string[]

    if (!emails.length) {
      skipped++
      continue
    }

    const appUrl = process.env.APP_URL ?? 'http://localhost:5173'
    const daysLabel = daysUntil === 0 ? 'hoje' : daysUntil === 1 ? 'amanhã' : `em ${daysUntil} dias`
    const amountFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(bill.amount)

    await sendEmail({
      to: emails,
      subject: `Lembrete: ${bill.name} vence ${daysLabel}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #18181b;">Lembrete de conta a pagar</h2>
          <p>A conta <strong>${bill.name}</strong> vence <strong>${daysLabel}</strong> (dia ${bill.due_day}).</p>
          <table style="border-collapse: collapse; margin: 16px 0; width: 100%;">
            <tr>
              <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Valor</td>
              <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${amountFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Vencimento</td>
              <td style="padding: 8px 0; font-size: 14px;">dia ${bill.due_day} de cada mês</td>
            </tr>
          </table>
          <a href="${appUrl}/bills" style="display:inline-block;background:#18181b;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:8px 0;">
            Ver contas a pagar
          </a>
          <p style="color:#71717a;font-size:12px;margin-top:24px;">Você recebe este lembrete porque configurou alertas para esta conta no Home Finances.</p>
        </div>
      `,
    })

    await supabase
      .from('bills')
      .update({ reminder_last_sent_at: new Date().toISOString() })
      .eq('id', bill.id)

    sent++
  }

  console.log(`[reminders] Done. sent=${sent}, skipped=${skipped}`)
}

const schedule = process.env.CRON_SCHEDULE ?? '0 11 * * *'
console.log(`[reminders] Scheduled with cron: ${schedule}`)

cron.schedule(schedule, () => {
  console.log('[reminders] Running bill reminders job...')
  sendBillReminders().catch((err) => console.error('[reminders] Error:', err))
})

// Also run immediately on startup if RUN_ON_START=true
if (process.env.RUN_ON_START === 'true') {
  console.log('[reminders] Running on startup...')
  sendBillReminders().catch((err) => console.error('[reminders] Error:', err))
}
