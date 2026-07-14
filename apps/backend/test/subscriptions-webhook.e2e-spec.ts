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
    // `created` (unix seconds) é usado pelo normalizeInvoice como occurredAt —
    // ausente nos demais testes deste arquivo (não precisam dele), presente
    // aqui por completude do shape real de um Stripe.Event.
    return { id, type, created: Math.floor(Date.now() / 1000), data: { object } };
  }

  function invoiceObject(overrides: Record<string, unknown> = {}) {
    return {
      id: "in_e2e_1",
      customer: customerId,
      status: "paid",
      amount_paid: 1490,
      amount_due: 1490,
      currency: "brl",
      ...overrides,
    };
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
    // billing_invoice_events do teste do customer desconhecido fica com
    // household_id NULL (por design) — não é limpo pelo DELETE de households
    // abaixo, então limpa por stripe_invoice_id explicitamente.
    await pool.query(`DELETE FROM public.billing_invoice_events WHERE stripe_invoice_id LIKE 'in_e2e_%'`);
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
    // M16: catálogo tem 4 planos (Essencial/Completo × mensal/anual); usa o
    // mensal do Completo como representante do teste (mesmo mecanismo de sync).
    const plan = await pool.query(
      `SELECT stripe_product_id, stripe_price_id FROM public.billing_plans WHERE key = 'completo_monthly'`,
    );
    const { stripe_product_id, stripe_price_id } = plan.rows[0];

    await postWebhook(
      subEvent("product.updated", { id: stripe_product_id, name: "Larmony Completo (renamed)", active: true }),
    ).expect(200);

    await postWebhook(
      subEvent("price.updated", {
        id: stripe_price_id,
        product: stripe_product_id,
        active: false,
        unit_amount: 1990,
        currency: "brl",
        recurring: { interval: "month" },
      }),
    ).expect(200);

    const after = await pool.query(
      `SELECT name, active FROM public.billing_plans WHERE key = 'completo_monthly'`,
    );
    expect(after.rows[0].name).toBe("Larmony Completo (renamed)");
    expect(after.rows[0].active).toBe(false);
  });

  describe("invoice.paid / invoice.payment_failed → espelho mínimo (M15 PR2)", () => {
    it("invoice.paid → grava o espelho com o lar resolvido pelo customer", async () => {
      await postWebhook(subEvent("invoice.paid", invoiceObject({ id: "in_e2e_paid_1" }))).expect(
        200,
      );

      const row = await pool.query(
        `SELECT household_id, type, amount_cents, currency FROM public.billing_invoice_events WHERE stripe_invoice_id = $1`,
        ["in_e2e_paid_1"],
      );
      expect(row.rows[0]).toMatchObject({
        household_id: householdId,
        type: "paid",
        amount_cents: 1490,
        currency: "brl",
      });
    });

    it("reentrega do MESMO invoice (event.id diferente) → idempotente por (stripe_invoice_id, type), não duplica", async () => {
      // Mesmo invoice id do teste anterior, evento novo (id diferente) — cenário
      // real de retry do Stripe reenviando o mesmo invoice.paid.
      await postWebhook(subEvent("invoice.paid", invoiceObject({ id: "in_e2e_paid_1" }))).expect(
        200,
      );

      const count = await pool.query(
        `SELECT count(*)::int AS n FROM public.billing_invoice_events WHERE stripe_invoice_id = $1 AND type = 'paid'`,
        ["in_e2e_paid_1"],
      );
      expect(count.rows[0].n).toBe(1);
    });

    it("invoice.payment_failed → grava type=payment_failed com amount_due", async () => {
      await postWebhook(
        subEvent(
          "invoice.payment_failed",
          invoiceObject({ id: "in_e2e_failed_1", status: "open", amount_paid: 0, amount_due: 1490 }),
        ),
      ).expect(200);

      const row = await pool.query(
        `SELECT type, amount_cents FROM public.billing_invoice_events WHERE stripe_invoice_id = $1`,
        ["in_e2e_failed_1"],
      );
      expect(row.rows[0]).toMatchObject({ type: "payment_failed", amount_cents: 1490 });
    });

    it("mesmo invoice, tipos diferentes (paid depois de payment_failed) → 2 linhas, não colide", async () => {
      await postWebhook(
        subEvent("invoice.paid", invoiceObject({ id: "in_e2e_failed_1", status: "paid" })),
      ).expect(200);

      const rows = await pool.query(
        `SELECT type FROM public.billing_invoice_events WHERE stripe_invoice_id = $1 ORDER BY type`,
        ["in_e2e_failed_1"],
      );
      expect(rows.rows.map((r: { type: string }) => r.type)).toEqual(["paid", "payment_failed"]);
    });

    it("customer sem lar correspondente → 200, grava o espelho com household_id NULL (não descarta o evento)", async () => {
      await postWebhook(
        subEvent(
          "invoice.paid",
          invoiceObject({ id: "in_e2e_unknown_customer", customer: "cus_e2e_never_registered" }),
        ),
      ).expect(200);

      // A linha é gravada mesmo sem household (household_id NULL) — o evento
      // não é descartado, só fica sem lar correlacionado.
      const row = await pool.query(
        `SELECT household_id FROM public.billing_invoice_events WHERE stripe_invoice_id = $1`,
        ["in_e2e_unknown_customer"],
      );
      expect(row.rows[0].household_id).toBeNull();
    });
  });
});
