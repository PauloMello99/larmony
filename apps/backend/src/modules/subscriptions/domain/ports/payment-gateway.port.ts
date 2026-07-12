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
}

export interface CreateCheckoutSessionOutput {
  url: string;
}

export interface CreatePortalSessionInput {
  customerId: string;
  returnUrl: string;
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
}
