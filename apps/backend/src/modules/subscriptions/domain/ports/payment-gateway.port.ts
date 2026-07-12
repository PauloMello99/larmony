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

/** Porta de pagamento (implementada por StripePaymentGateway). */
export interface IPaymentGateway {
  createCustomer(input: CreateCustomerInput): Promise<CreateCustomerOutput>;
  createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CreateCheckoutSessionOutput>;
  createPortalSession(
    input: CreatePortalSessionInput,
  ): Promise<CreatePortalSessionOutput>;
}
