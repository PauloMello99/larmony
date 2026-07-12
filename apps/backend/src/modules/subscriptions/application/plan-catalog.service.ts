import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PLAN_CATALOG } from "../domain/plan-catalog";
import {
  BILLING_PLAN_REPOSITORY,
  type IBillingPlanRepository,
} from "../domain/billing-plan.repository.interface";
import {
  PAYMENT_GATEWAY,
  type IPaymentGateway,
} from "../domain/ports/payment-gateway.port";

/**
 * Sincroniza `PLAN_CATALOG` com o Stripe no boot: para cada plano, busca um
 * Price existente por `lookup_key`; se achou, espelha os IDs localmente; se
 * não achou, cria Product (id customizado determinístico) + Price (com o
 * lookup_key) e espelha. O Stripe é a fonte de verdade de existência —
 * `billing_plans` é só cache local para os use-cases não chamarem a API a
 * cada checkout.
 *
 * Falha vira log de erro, nunca derruba o boot (mesmo espírito de "Stripe
 * ausente não quebra o app" do StripePaymentGateway) — um checkout chamado
 * antes da reconciliação completar lança PlanNotAvailableException, erro
 * claro em vez de comportamento indefinido.
 */
@Injectable()
export class PlanCatalogService implements OnModuleInit {
  private readonly logger = new Logger(PlanCatalogService.name);

  constructor(
    @Inject(PAYMENT_GATEWAY) private readonly gateway: IPaymentGateway,
    @Inject(BILLING_PLAN_REPOSITORY) private readonly repo: IBillingPlanRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.reconcile();
    } catch (err) {
      this.logger.error(
        `Falha ao reconciliar catálogo de planos com o Stripe: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async reconcile(): Promise<void> {
    for (const plan of PLAN_CATALOG) {
      const existing = await this.gateway.findPriceByLookupKey(plan.key);

      if (existing) {
        await this.repo.upsert({
          key: plan.key,
          stripeProductId: existing.productId,
          stripePriceId: existing.priceId,
          name: plan.productName,
          amountCents: plan.amountCents,
          currency: plan.currency,
          interval: plan.interval,
        });
        continue;
      }

      const product = await this.gateway.ensureProduct({
        id: plan.productKey,
        name: plan.productName,
      });
      const price = await this.gateway.createPrice({
        productId: product.productId,
        unitAmountCents: plan.amountCents,
        currency: plan.currency,
        interval: plan.interval,
        lookupKey: plan.key,
      });

      await this.repo.upsert({
        key: plan.key,
        stripeProductId: product.productId,
        stripePriceId: price.priceId,
        name: plan.productName,
        amountCents: plan.amountCents,
        currency: plan.currency,
        interval: plan.interval,
      });

      this.logger.log(`Plano "${plan.key}" criado no Stripe e sincronizado.`);
    }
  }
}
