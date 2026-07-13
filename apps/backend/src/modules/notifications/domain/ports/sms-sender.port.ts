export const SMS_SENDER = Symbol("SMS_SENDER");

export interface SendSmsInput {
  to: string;
  body: string;
}

/**
 * Porta de envio de SMS (M11: stub — sem provedor integrado). Espelha
 * `IEmailSender` (`mail/domain/ports/email-sender.port.ts`).
 * - Canal desabilitado (flag off, default) → no-op, retorna `false`.
 * - Canal habilitado sem provedor real integrado → lança (nunca finge enviar).
 */
export interface ISmsSender {
  send(input: SendSmsInput): Promise<boolean>;
}
