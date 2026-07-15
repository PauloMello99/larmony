import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE_ADMIN, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type {
  IBillingInvoiceEventRepository,
  RecordInvoiceEventData,
} from "../../domain/billing-invoice-event.repository.interface";

/** Espelho de invoices — sem GRANT/RLS, só DRIZZLE_ADMIN (mesmo padrão de stripe_webhook_events). */
@Injectable()
export class DrizzleBillingInvoiceEventRepository
  implements IBillingInvoiceEventRepository
{
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async record(data: RecordInvoiceEventData): Promise<void> {
    await this.db
      .insert(schema.billingInvoiceEvents)
      .values({
        stripeInvoiceId: data.stripeInvoiceId,
        householdId: data.householdId,
        type: data.type,
        amountCents: data.amountCents,
        currency: data.currency,
        occurredAt: data.occurredAt,
      })
      .onConflictDoNothing({
        target: [schema.billingInvoiceEvents.stripeInvoiceId, schema.billingInvoiceEvents.type],
      });
  }
}
