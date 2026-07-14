export const BILLING_INVOICE_EVENT_REPOSITORY = Symbol(
  "BILLING_INVOICE_EVENT_REPOSITORY",
);

export interface RecordInvoiceEventData {
  stripeInvoiceId: string;
  householdId: string | null;
  type: "paid" | "payment_failed";
  amountCents: number;
  currency: string;
  occurredAt: Date;
}

export interface IBillingInvoiceEventRepository {
  /**
   * Upsert-ignore em `(stripe_invoice_id, type)` — idempotente contra
   * reentrega do webhook (o `HandleStripeWebhookUseCase` já é idempotente por
   * `event.id`, mas o Stripe pode reenviar o MESMO invoice.paid com um
   * event.id diferente numa retentativa; a constraint é a segunda rede).
   */
  record(data: RecordInvoiceEventData): Promise<void>;
}
