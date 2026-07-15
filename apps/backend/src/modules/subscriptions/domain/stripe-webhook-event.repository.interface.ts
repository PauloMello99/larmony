export const STRIPE_WEBHOOK_EVENT_REPOSITORY = Symbol(
  "STRIPE_WEBHOOK_EVENT_REPOSITORY",
);

export interface IStripeWebhookEventRepository {
  /**
   * Reivindica o evento para processamento (idempotência). Insere a linha e
   * retorna `true` se era novo; `false` se já existia (já processado ou em
   * processamento) — o chamador deve então tratar como no-op.
   */
  claim(id: string, type: string): Promise<boolean>;
  /** Marca `processed_at` — auditoria de que o handler concluiu sem erro. */
  markProcessed(id: string): Promise<void>;
}
