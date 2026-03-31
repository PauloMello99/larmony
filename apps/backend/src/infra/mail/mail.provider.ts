export interface MailOptions {
  to: string
  subject: string
  html: string
}

/** Abstract token used for NestJS DI — inject with @Inject(MailProvider) */
export abstract class MailProvider {
  abstract sendMail(options: MailOptions): Promise<void>
}
