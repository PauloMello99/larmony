import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE_ADMIN, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type { IStripeWebhookEventRepository } from "../../domain/stripe-webhook-event.repository.interface";

/** Idempotência do webhook — sem GRANT/RLS, só DRIZZLE_ADMIN (ver 0009). */
@Injectable()
export class DrizzleStripeWebhookEventRepository
  implements IStripeWebhookEventRepository
{
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async claim(id: string, type: string): Promise<boolean> {
    // PK = event.id: insere-uma-vez. Conflito = já reivindicado → false.
    const rows = await this.db
      .insert(schema.stripeWebhookEvents)
      .values({ id, type })
      .onConflictDoNothing({ target: schema.stripeWebhookEvents.id })
      .returning({ id: schema.stripeWebhookEvents.id });

    return rows.length > 0;
  }

  async markProcessed(id: string): Promise<void> {
    await this.db
      .update(schema.stripeWebhookEvents)
      .set({ processedAt: new Date() })
      .where(eq(schema.stripeWebhookEvents.id, id));
  }
}
