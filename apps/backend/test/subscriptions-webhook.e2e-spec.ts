import { INestApplication } from "@nestjs/common";
import { Pool } from "pg";
import request from "supertest";
import Stripe from "stripe";
import { adminPool, authed, cleanupByEmailPattern, createTestApp, signUpUser, TestUser } from "./helpers";

const WEBHOOK_SECRET = process.env["STRIPE_WEBHOOK_SECRET"] ?? "whsec_test_local_larmony_b3";
// Instância só para assinar payloads de teste (não chama a API do Stripe).
const stripeForSigning = new Stripe("sk_test_dummy_for_signing");

let evtSeq = 0;
function uniqueEventId(): string {
  evtSeq += 1;
  return `evt_e2e_${Date.now()}_${evtSeq}`;
}

describe("Subscriptions webhook (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let owner: TestUser;
  let householdId: string;
  const customerId = `cus_e2e_${Date.now()}`;

  function postWebhook(
    payloadObj: unknown,
    opts: { validSignature?: boolean } = {},
  ) {
    const payload = JSON.stringify(payloadObj);
    const signature = opts.validSignature === false
      ? "t=1,v1=deadbeef"
      : stripeForSigning.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
    return request(app.getHttpServer())
      .post("/webhooks/stripe")
      .set("Content-Type", "application/json")
      .set("stripe-signature", signature)
      .send(payload);
  }

  function subscriptionObject(overrides: Record<string, unknown> = {}) {
    return {
      id: "sub_e2e_1",
      customer: customerId,
      status: "active",
      cancel_at_period_end: false,
      canceled_at: null,
      items: {
        data: [
          {
            current_period_start: 1751328000, // 2026-07-01
            current_period_end: 1753920000, // 2026-07-31
            price: {
              id: "price_e2e_x",
              unit_amount: 1490,
              currency: "brl",
              recurring: { interval: "month" },
            },
          },
        ],
      },
      ...overrides,
    };
  }

  function subEvent(type: string, object: unknown, id = uniqueEventId()) {
    return { id, type, data: { object } };
  }

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
    owner = await signUpUser(app, "wh.owner");

    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Webhook" })
      .expect(201);
    householdId = created.body.id;

    // Garante a linha de subscription (getOrCreate) e vincula um customer Stripe
    // conhecido, para o webhook correlacionar o evento ao household.
    await authed(app, "get", `/households/${householdId}/subscription`, owner.accessToken).expect(200);
    await pool.query(
      `UPDATE public.subscriptions SET stripe_customer_id = $1 WHERE household_id = $2`,
      [customerId, householdId],
    );
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  it("assinatura inválida → 400", async () => {
    await postWebhook(subEvent("customer.subscription.updated", subscriptionObject()), {
      validSignature: false,
    }).expect(400);
  });

  it("customer.subscription.updated (active) → sincroniza standard/active + período", async () => {
    await postWebhook(subEvent("customer.subscription.updated", subscriptionObject())).expect(200);

    const got = await authed(app, "get", `/households/${householdId}/subscription`, owner.accessToken).expect(200);
    expect(got.body.type).toBe("standard");
    expect(got.body.status).toBe("active");
    expect(got.body.stripeSubscriptionId).toBe("sub_e2e_1");

    const row = await pool.query(
      `SELECT current_period_end, price_cents, billing_interval FROM public.subscriptions WHERE household_id = $1`,
      [householdId],
    );
    expect(row.rows[0].current_period_end).not.toBeNull();
    expect(row.rows[0].price_cents).toBe(1490);
    expect(row.rows[0].billing_interval).toBe("monthly");
  });

  it("replay do mesmo event.id → idempotente (1 linha em stripe_webhook_events, estado inalterado)", async () => {
    const evt = subEvent("customer.subscription.updated", subscriptionObject({ status: "past_due" }));
    await postWebhook(evt).expect(200);

    const afterFirst = await authed(app, "get", `/households/${householdId}/subscription`, owner.accessToken).expect(200);
    expect(afterFirst.body.status).toBe("past_due");

    // Replay: mesmo id, mas com status diferente no payload — deve ser ignorado.
    const replay = { ...evt, data: { object: subscriptionObject({ status: "active" }) } };
    await postWebhook(replay).expect(200);

    const afterReplay = await authed(app, "get", `/households/${householdId}/subscription`, owner.accessToken).expect(200);
    expect(afterReplay.body.status).toBe("past_due"); // não mudou

    const count = await pool.query(
      `SELECT count(*)::int AS n FROM public.stripe_webhook_events WHERE id = $1`,
      [evt.id],
    );
    expect(count.rows[0].n).toBe(1);
  });

  it("customer.subscription.deleted → volta a free/canceled", async () => {
    await postWebhook(
      subEvent("customer.subscription.deleted", subscriptionObject({ status: "canceled", canceled_at: 1753920000 })),
    ).expect(200);

    const got = await authed(app, "get", `/households/${householdId}/subscription`, owner.accessToken).expect(200);
    expect(got.body.type).toBe("free");
    expect(got.body.status).toBe("canceled");
  });

  it("comp (type=custom) NÃO é rebaixado por um evento de cancelamento", async () => {
    await pool.query(
      `UPDATE public.subscriptions SET type = 'custom' WHERE household_id = $1`,
      [householdId],
    );

    await postWebhook(
      subEvent("customer.subscription.deleted", subscriptionObject({ status: "canceled" })),
    ).expect(200);

    const got = await authed(app, "get", `/households/${householdId}/subscription`, owner.accessToken).expect(200);
    expect(got.body.type).toBe("custom"); // comp preservado
  });

  it("product.updated / price.updated → espelham no catálogo billing_plans", async () => {
    const plan = await pool.query(
      `SELECT stripe_product_id, stripe_price_id FROM public.billing_plans WHERE key = 'premium_monthly'`,
    );
    const { stripe_product_id, stripe_price_id } = plan.rows[0];

    await postWebhook(
      subEvent("product.updated", { id: stripe_product_id, name: "Larmony Premium (renamed)", active: true }),
    ).expect(200);

    await postWebhook(
      subEvent("price.updated", {
        id: stripe_price_id,
        product: stripe_product_id,
        active: false,
        unit_amount: 1490,
        currency: "brl",
        recurring: { interval: "month" },
      }),
    ).expect(200);

    const after = await pool.query(
      `SELECT name, active FROM public.billing_plans WHERE key = 'premium_monthly'`,
    );
    expect(after.rows[0].name).toBe("Larmony Premium (renamed)");
    expect(after.rows[0].active).toBe(false);
  });
});
