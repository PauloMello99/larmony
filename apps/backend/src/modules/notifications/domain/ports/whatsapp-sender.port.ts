export const WHATSAPP_SENDER = Symbol("WHATSAPP_SENDER");

export interface SendWhatsAppInput {
  to: string;
  body: string;
}

/**
 * Porta de envio de WhatsApp (M11: stub — sem provedor integrado; WhatsApp
 * Business API exige aprovação de template pela Meta, 2–4 semanas). Espelha
 * `IEmailSender`.
 * - Canal desabilitado (flag off, default) → no-op, retorna `false`.
 * - Canal habilitado sem provedor real integrado → lança (nunca finge enviar).
 */
export interface IWhatsAppSender {
  send(input: SendWhatsAppInput): Promise<boolean>;
}
