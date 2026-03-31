import { Global, Module } from '@nestjs/common'
import { MailProvider } from './mail.provider'
import { ResendMailProvider } from './resend.provider'

@Global()
@Module({
  providers: [{ provide: MailProvider, useClass: ResendMailProvider }],
  exports: [MailProvider],
})
export class MailModule {}
