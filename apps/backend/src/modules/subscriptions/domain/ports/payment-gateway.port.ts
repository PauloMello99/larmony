export const PAYMENT_GATEWAY = Symbol("PAYMENT_GATEWAY");

export interface CreateCustomerInput {
  email: string;
  metadata: Record<string, string>;
}

export interface CreateCustomerOutput {
  customerId: string;
}

export interface CreateCheckoutSessionInput {
  /** Customer Stripe já existente — sempre pré-criado via createCustomer()
   *  antes do checkout (nunca deixamos o Checkout criar o customer: em modo
   *  subscription, `session.customer` só é populado após o pagamento
   *  completar, o que quebraria o "primeiro checkout" antes do webhook/B-3). */
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
  /** Locale da UI (AppLocale) — página hospedada do Stripe no idioma do usuário. */
  locale?: string | null;
}

export interface CreateCheckoutSessionOutput {
  url: string;
}

export interface CreatePortalSessionInput {
  customerId: string;
  returnUrl: string;
  /** Locale da UI (AppLocale) — Billing Portal no idioma do usuário. */
  locale?: string | null;
}

export interface CreatePortalSessionOutput {
  url: string;
}

export interface FindPriceByLookupKeyOutput {
  priceId: string;
  productId: string;
}

export interface EnsureProductInput {
  /** Id customizado determinístico (ex.: "premium") — permite achar o
   *  mesmo Product em sincronizações futuras sem guardar nada além dele. */
  id: string;
  name: string;
}

export interface EnsureProductOutput {
  productId: string;
}

export interface CreatePriceInput {
  productId: string;
  unitAmountCents: number;
  currency: string;
  interval: "month" | "year";
  /** Grava no Price — é o que permite achá-lo depois via lookup_keys. */
  lookupKey: string;
}

export interface CreatePriceOutput {
  priceId: string;
}

// ─── Coupon / desconto administrativo (M14, B-7) ────────────────────────────

export type CouponDuration = "once" | "repeating" | "forever";

export interface CreateCouponInput {
  /** Exatamente um de percentOff / amountOffCents (validado no use-case). */
  percentOff?: number;
  amountOffCents?: number;
  /** Obrigatório quando amountOffCents é usado (moeda do Coupon). */
  currency?: string;
  duration: CouponDuration;
  /** Obrigatório quando duration === "repeating". */
  durationInMonths?: number;
}

export interface CreateCouponOutput {
  couponId: string;
}

// ─── Webhook (M14, B-3) — formas normalizadas: o Stripe fica 100% na infra ───

export type BillingInterval = "monthly" | "annual";

/** Estado de uma assinatura, normalizado a partir do Stripe (sync bidirecional). */
export interface NormalizedSubscription {
  id: string;
  customerId: string;
  /** Status cru do Stripe (8 valores) — o mapeamento p/ nossa enum é no domínio. */
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  priceCents: number | null;
  interval: BillingInterval | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
}

export interface NormalizedProduct {
  id: string;
  name: string;
  active: boolean;
}

export interface NormalizedPrice {
  id: string;
  productId: string | null;
  active: boolean;
  unitAmountCents: number | null;
  currency: string | null;
  interval: BillingInterval | null;
}

/** Evento de webhook já verificado e normalizado (campos por tipo). */
export interface StripeWebhookEvent {
  id: string;
  type: string;
  // checkout.session.completed
  checkoutHouseholdId?: string | null;
  checkoutSubscriptionId?: string | null;
  // customer.subscription.*
  subscription?: NormalizedSubscription;
  // product.*
  product?: NormalizedProduct;
  // price.*
  price?: NormalizedPrice;
}

/** Porta de pagamento (implementada por StripePaymentGateway). */
export interface IPaymentGateway {
  createCustomer(input: CreateCustomerInput): Promise<CreateCustomerOutput>;
  createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CreateCheckoutSessionOutput>;
  createPortalSession(
    input: CreatePortalSessionInput,
  ): Promise<CreatePortalSessionOutput>;
  /** Catálogo de planos (M14) — busca um Price existente pelo lookup_key. */
  findPriceByLookupKey(
    lookupKey: string,
  ): Promise<FindPriceByLookupKeyOutput | null>;
  /** Retrieve-or-create por id customizado determinístico. */
  ensureProduct(input: EnsureProductInput): Promise<EnsureProductOutput>;
  createPrice(input: CreatePriceInput): Promise<CreatePriceOutput>;
  /**
   * Verifica a assinatura do webhook e normaliza o evento. Lança se a
   * assinatura for inválida (B-3). `payload` é o RAW body.
   */
  constructWebhookEvent(
    payload: Buffer | string,
    signature: string,
  ): StripeWebhookEvent;
  /** Retrieve normalizado de uma assinatura (webhook checkout + reconciliação). */
  getSubscription(
    subscriptionId: string,
  ): Promise<NormalizedSubscription | null>;

  // ─── Desconto/isenção administrativo (B-7) ───────────────────────────────
  /** Cria um Coupon no Stripe (desconto sempre passa pela API — ADR-0026 §3). */
  createCoupon(input: CreateCouponInput): Promise<CreateCouponOutput>;
  /** Anexa o coupon à assinatura (aplica o desconto na próxima fatura). */
  applyCouponToSubscription(
    subscriptionId: string,
    couponId: string,
  ): Promise<void>;
  /** Remove o desconto ativo da assinatura. */
  removeSubscriptionDiscount(subscriptionId: string): Promise<void>;
  /**
   * Cancela a assinatura no Stripe (comp sobre sub ativa; suspensão de lar pago).
   * `prorate` credita o tempo não usado na conta do cliente e `invoiceNow`
   * fecha a fatura final na hora — reembolso em DINHEIRO, quando couber, é
   * manual no dashboard do Stripe (1 clique no payment), não automatizado.
   */
  cancelSubscription(
    subscriptionId: string,
    options?: { prorate?: boolean; invoiceNow?: boolean },
  ): Promise<void>;
}
