const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM_ADDRESS = 'Home Finances <noreply@homefi.app>'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
}

/**
 * Sends an email via Resend.
 * Requires RESEND_API_KEY environment variable to be set.
 * If RESEND_API_KEY is not set, logs a warning and skips sending (useful for local dev).
 */
export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    console.warn('[resend] RESEND_API_KEY not set — skipping email send')
    return
  }

  const recipients = Array.isArray(opts.to) ? opts.to : [opts.to]

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: recipients,
      subject: opts.subject,
      html: opts.html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend API error ${res.status}: ${body}`)
  }
}
