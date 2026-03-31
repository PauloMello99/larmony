import { Injectable, Logger } from '@nestjs/common'
import { MailOptions, MailProvider } from './mail.provider'

const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM_ADDRESS = 'Larmony <team@larmony.me>'

@Injectable()
export class ResendMailProvider extends MailProvider {
  private readonly logger = new Logger(ResendMailProvider.name)
  private readonly apiKey = process.env.RESEND_API_KEY

  async sendMail({ to, subject, html }: MailOptions): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn('RESEND_API_KEY not set — skipping email send')
      return
    }

    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
    })

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string }
      this.logger.error(`Resend error ${res.status}: ${body.message ?? JSON.stringify(body)}`)
      throw new Error('Falha ao enviar e-mail')
    }

    this.logger.log(`Email enviado para ${to}`)
  }
}
