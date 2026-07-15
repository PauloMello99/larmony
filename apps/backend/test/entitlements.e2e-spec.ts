import { INestApplication } from "@nestjs/common";
import { Pool } from "pg";
import {
  adminPool,
  authed,
  cleanupByEmailPattern,
  createTestApp,
  signUpUser,
  TestUser,
} from "./helpers";

/** Gating de entitlements (M16 — pago-only, 2 tiers + locked). */
describe("Entitlements gating (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let owner: TestUser;
  let householdId: string;

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
    owner = await signUpUser(app, "ent.owner");

    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Entitlements" })
      .expect(201);
    householdId = created.body.id;
    // Garante a linha de subscription (getOrCreate) — default type='free' (locked).
    await authed(app, "get", `/households/${householdId}/subscription`, owner.accessToken).expect(200);
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  it("sem assinatura (free) → plano locked; leitura livre, anual bloqueado (402)", async () => {
    const got = await authed(
      app,
      "get",
      `/households/${householdId}/subscription`,
      owner.accessToken,
    ).expect(200);
    expect(got.body.type).toBe("free");
    expect(got.body.entitlements.plan).toBe("locked");
    expect(got.body.entitlements.source).toBe("locked");
    expect(got.body.entitlements.capabilities.advanced_reports).toBe(false);

    // Leitura (relatório mensal) livre mesmo locked.
    await authed(app, "get", `/households/${householdId}/reports/monthly`, owner.accessToken).expect(200);
    // Feature Completo (anual) bloqueada.
    const blocked = await authed(
      app,
      "get",
      `/households/${householdId}/reports/annual`,
      owner.accessToken,
    ).expect(402);
    expect(blocked.body.code).toBe("PREMIUM_REQUIRED");
  });

  it("Essencial (standard/active, tier essencial) → anual ainda 402; plan=essencial", async () => {
    await pool.query(
      `UPDATE public.subscriptions SET type='standard', status='active', tier='essencial',
         stripe_subscription_id='sub_ent_ess', comp_reason=NULL WHERE household_id = $1`,
      [householdId],
    );

    const got = await authed(
      app,
      "get",
      `/households/${householdId}/subscription`,
      owner.accessToken,
    ).expect(200);
    expect(got.body.entitlements.plan).toBe("essencial");
    expect(got.body.entitlements.source).toBe("stripe");
    expect(got.body.entitlements.capabilities.advanced_reports).toBe(false);

    await authed(app, "get", `/households/${householdId}/reports/annual`, owner.accessToken).expect(402);
  });

  it("Completo (standard/active, tier completo) → anual liberado (200); capability true", async () => {
    await pool.query(
      `UPDATE public.subscriptions SET type='standard', status='active', tier='completo',
         stripe_subscription_id='sub_ent_comp' WHERE household_id = $1`,
      [householdId],
    );

    await authed(app, "get", `/households/${householdId}/reports/annual`, owner.accessToken).expect(200);

    const got = await authed(
      app,
      "get",
      `/households/${householdId}/subscription`,
      owner.accessToken,
    ).expect(200);
    expect(got.body.entitlements.plan).toBe("completo");
    expect(got.body.entitlements.capabilities.advanced_reports).toBe(true);
  });

  it("comp (type=custom) → completo + source comp; anual liberado (200)", async () => {
    await pool.query(
      `UPDATE public.subscriptions SET type='custom', status='active', comp_reason='parceria'
       WHERE household_id = $1`,
      [householdId],
    );

    await authed(app, "get", `/households/${householdId}/reports/annual`, owner.accessToken).expect(200);

    const got = await authed(
      app,
      "get",
      `/households/${householdId}/subscription`,
      owner.accessToken,
    ).expect(200);
    expect(got.body.entitlements.plan).toBe("completo");
    expect(got.body.entitlements.source).toBe("comp");
  });
});
