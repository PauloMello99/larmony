import cron from 'node-cron'
import { createClient } from '@supabase/supabase-js'

const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM_ADDRESS = 'Larmony <team@larmony.me>'

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

    const html = getHtml({
      billName: bill.name,
      billDueDay: bill.due_day,
      daysLabel,
      amountFormatted,
      appUrl
    })

    await sendEmail({
      to: emails,
      subject: `Lembrete: ${bill.name} vence ${daysLabel}`,
      html
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

interface GetHtmlParams {
  billName: string
  billDueDay: number
  daysLabel: string
  amountFormatted: string
  appUrl: string
}
  
function getHtml(params: GetHtmlParams) {
  const { billName, billDueDay, daysLabel, amountFormatted, appUrl } = params

  return `
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="pt-BR">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
  </head>
  <body style="background-color:#f4f4f5;margin:0;padding:0">
    <!--$--><!--html--><!--head-->
    <div
      style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0"
      data-skip-in-text="true">
      Lembrete: ${billName} vence em ${daysLabel}
      <div>
         ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿
      </div>
    </div>
    <!--body-->
    <table
      border="0"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      align="center">
      <tbody>
        <tr>
          <td
            style="background-color:#f4f4f5;font-family:ui-sans-serif, system-ui, sans-serif;margin:0;padding:40px 0">
            <table
              align="center"
              width="100%"
              border="0"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="max-width:520px;background-color:#ffffff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin:0 auto;overflow:hidden">
              <tbody>
                <tr style="width:100%">
                  <td>
                    <table
                      align="center"
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                      style="background-color:#0F1923;padding:28px 32px">
                      <tbody>
                        <tr>
                          <td>
                            <p
                              style="font-size:22px;line-height:24px;color:#9FE1CB;font-weight:600;letter-spacing:0.5px;font-family:Georgia, &#x27;Times New Roman&#x27;, serif;margin:0;margin-top:0;margin-bottom:0;margin-left:0;margin-right:0">
                              larmony
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table
                      align="center"
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                      style="padding:36px 32px 24px">
                      <tbody>
                        <tr>
                          <td>
                            <h1
                              style="color:#18181b;font-size:22px;font-weight:700;margin:0 0 12px">
                              Lembrete de conta a pagar
                            </h1>
                            <p
                              style="font-size:15px;line-height:1.6;color:#52525b;margin:0 0 24px;margin-top:0;margin-right:0;margin-bottom:24px;margin-left:0">
                              A conta <strong>${billName}</strong> vence<!-- -->
                              <strong style="color:#5DCAA5">${daysLabel}</strong>.
                            </p>
                            <table
                              align="center"
                              width="100%"
                              border="0"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                              style="background-color:#f8f8f9;border-radius:8px;padding:16px 20px;margin:0 0 24px">
                              <tbody>
                                <tr>
                                  <td>
                                    <table
                                      align="center"
                                      width="100%"
                                      border="0"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation"
                                      style="margin-bottom:10px">
                                      <tbody style="width:100%">
                                        <tr style="width:100%">
                                          <td
                                            data-id="__react-email-column"
                                            style="color:#71717a;font-size:13px;width:110px;vertical-align:middle">
                                            Conta
                                          </td>
                                          <td
                                            data-id="__react-email-column"
                                            style="color:#18181b;font-size:14px;vertical-align:middle">
                                            ${billName}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                    <table
                                      align="center"
                                      width="100%"
                                      border="0"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation"
                                      style="margin-bottom:10px">
                                      <tbody style="width:100%">
                                        <tr style="width:100%">
                                          <td
                                            data-id="__react-email-column"
                                            style="color:#71717a;font-size:13px;width:110px;vertical-align:middle">
                                            Valor
                                          </td>
                                          <td
                                            data-id="__react-email-column"
                                            style="color:#18181b;font-size:14px;vertical-align:middle;font-weight:700">
                                            ${amountFormatted}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                    <table
                                      align="center"
                                      width="100%"
                                      border="0"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation"
                                      style="margin-bottom:10px">
                                      <tbody style="width:100%">
                                        <tr style="width:100%">
                                          <td
                                            data-id="__react-email-column"
                                            style="color:#71717a;font-size:13px;width:110px;vertical-align:middle">
                                            Vencimento
                                          </td>
                                          <td
                                            data-id="__react-email-column"
                                            style="color:#18181b;font-size:14px;vertical-align:middle">
                                            dia
                                            <!-- -->${billDueDay}<!-- -->
                                            de cada mês
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                    <table
                                      align="center"
                                      width="100%"
                                      border="0"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation">
                                      <tbody style="width:100%">
                                        <tr style="width:100%">
                                          <td
                                            data-id="__react-email-column"
                                            style="color:#71717a;font-size:13px;width:110px;vertical-align:middle">
                                            Quando
                                          </td>
                                          <td
                                            data-id="__react-email-column"
                                            style="color:#5DCAA5;font-size:14px;vertical-align:middle;font-weight:600">
                                            ${daysLabel}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                            <a
                              href="${appUrl}/bills"
                              style="line-height:100%;text-decoration:none;display:inline-block;max-width:100%;mso-padding-alt:0px;background-color:#0F1923;border-radius:6px;color:#ffffff;font-size:15px;font-weight:600;padding:13px 28px;padding-top:13px;padding-right:28px;padding-bottom:13px;padding-left:28px"
                              target="_blank"
                              ><span
                                ><!--[if mso
                                  ]><i
                                    style="mso-font-width:466.6666666666667%;mso-text-raise:19.5"
                                    hidden
                                    >&#8202;&#8202;&#8202;</i
                                  ><!
                                [endif]--></span
                              ><span
                                style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px;mso-text-raise:9.75px"
                                >Ver contas a pagar</span
                              ><span
                                ><!--[if mso
                                  ]><i
                                    style="mso-font-width:466.6666666666667%"
                                    hidden
                                    >&#8202;&#8202;&#8202;&#8203;</i
                                  ><!
                                [endif]--></span
                              ></a
                            >
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <hr
                      style="width:100%;border:none;border-top:1px solid #eaeaea;border-color:#e4e4e7;margin:0 32px" />
                    <table
                      align="center"
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                      style="padding:16px 32px 28px">
                      <tbody>
                        <tr>
                          <td>
                            <p
                              style="font-size:12px;line-height:24px;color:#a1a1aa;margin:0 0 4px;margin-top:0;margin-right:0;margin-bottom:4px;margin-left:0">
                              Você recebe este lembrete porque configurou
                              alertas para esta conta no Larmony.
                            </p>
                            <p
                              style="font-size:11px;line-height:24px;color:#d4d4d8;margin:8px 0 0;margin-top:8px;margin-right:0;margin-bottom:0;margin-left:0">
                              Larmony · Planejamento financeiro do seu lar
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
    <!--/$-->
  </body>
</html>
  `
}
