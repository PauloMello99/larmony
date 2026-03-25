import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from '../_shared/resend.ts'

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const today = new Date()
    const currentDay = today.getUTCDate()
    const currentMonth = today.getUTCMonth() // 0-indexed
    const currentYear = today.getUTCFullYear()

    // Fetch all active bills that have a reminder configured
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select(`
        id,
        name,
        amount,
        due_day,
        reminder_days_before,
        reminder_last_sent_at,
        household_id
      `)
      .eq('is_active', true)
      .not('reminder_days_before', 'is', null)

    if (billsError) {
      console.error('[send-bill-reminders] Error fetching bills:', billsError)
      return new Response(JSON.stringify({ error: billsError.message }), { status: 500 })
    }

    if (!bills || bills.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: 0 }), { status: 200 })
    }

    let sent = 0
    let skipped = 0

    for (const bill of bills) {
      // Calculate days until due
      let daysUntil = bill.due_day - currentDay
      if (daysUntil < 0) {
        // Due day already passed this month — next occurrence is next month
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getUTCDate()
        daysUntil = daysInMonth - currentDay + bill.due_day
      }

      // Only send if today matches the configured reminder window
      if (daysUntil !== bill.reminder_days_before) {
        skipped++
        continue
      }

      // Check if reminder was already sent this month
      if (bill.reminder_last_sent_at) {
        const lastSent = new Date(bill.reminder_last_sent_at)
        if (
          lastSent.getUTCMonth() === currentMonth &&
          lastSent.getUTCFullYear() === currentYear
        ) {
          skipped++
          continue
        }
      }

      // Fetch all member emails for this household
      const { data: memberships, error: membershipsError } = await supabase
        .from('household_memberships')
        .select('user_id')
        .eq('household_id', bill.household_id)

      if (membershipsError || !memberships || memberships.length === 0) {
        console.warn(`[send-bill-reminders] No members found for household ${bill.household_id}`)
        skipped++
        continue
      }

      const userIds = memberships.map((m) => m.user_id)

      const emailResults = await Promise.all(
        userIds.map((uid) => supabase.auth.admin.getUserById(uid))
      )

      const emails = emailResults
        .map((r) => r.data?.user?.email)
        .filter(Boolean) as string[]
      if (emails.length === 0) {
        skipped++
        continue
      }

      const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
      const dueDateLabel = `dia ${bill.due_day}`
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
            <p>A conta <strong>${bill.name}</strong> vence <strong>${daysLabel}</strong> (${dueDateLabel}).</p>
            <table style="border-collapse: collapse; margin: 16px 0; width: 100%;">
              <tr>
                <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Valor</td>
                <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${amountFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Vencimento</td>
                <td style="padding: 8px 0; font-size: 14px;">${dueDateLabel} de cada mês</td>
              </tr>
            </table>
            <a href="${appUrl}/bills" style="display:inline-block;background:#18181b;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:8px 0;">
              Ver contas a pagar
            </a>
            <p style="color:#71717a;font-size:12px;margin-top:24px;">Você recebe este lembrete porque configurou alertas para esta conta no Home Finances.</p>
          </div>
        `,
      })

      // Update reminder_last_sent_at to prevent duplicate sends this month
      await supabase
        .from('bills')
        .update({ reminder_last_sent_at: new Date().toISOString() })
        .eq('id', bill.id)

      sent++
    }

    console.log(`[send-bill-reminders] Done. sent=${sent}, skipped=${skipped}`)
    return new Response(JSON.stringify({ sent, skipped }), { status: 200 })
  } catch (err) {
    console.error('[send-bill-reminders] Unexpected error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
