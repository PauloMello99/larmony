import { Inject, Injectable } from "@nestjs/common";
import {
  SUBSCRIPTION_REPOSITORY,
  type ISubscriptionRepository,
} from "../../domain/subscription.repository.interface";
import {
  PAYMENT_GATEWAY,
  type IPaymentGateway,
  type ListInvoicesOutput,
} from "../../domain/ports/payment-gateway.port";

/**
 * Lista as faturas do lar (M16 PR4) — atende o pedido original de poder ver
 * os meses já pagos direto do painel admin. Sem customer Stripe (lar nunca
 * passou por checkout) não há faturas para listar.
 */
@Injectable()
export class ListSubscriptionInvoicesUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly repo: ISubscriptionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
  ) {}

  async execute(householdId: string): Promise<ListInvoicesOutput> {
    const sub = await this.repo.getOrCreate(householdId);
    if (!sub.stripeCustomerId) return { invoices: [] };
    return this.gateway.listInvoices(sub.stripeCustomerId);
  }
}
