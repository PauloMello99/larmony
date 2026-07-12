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

    // Garante a linha de subscription (getOrCreate) — default type='free'.
    await authed(
      app,
      "get",
      `/households/${householdId}/subscription`,
      owner.accessToken,
    ).expect(200);
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  it("GET /subscription expõe entitlements (free → advanced_reports=false)", async () => {
    const got = await authed(
      app,
      "get",
      `/households/${householdId}/subscription`,
      owner.accessToken,
    ).expect(200);

    // Top-level preservado (contrato dos e2e de B-2/B-3).
    expect(got.body.type).toBe("free");
    expect(got.body.status).toBeDefined();
    // Novo contrato p/ o paywall (B-6).
    expect(got.body.entitlements.plan).toBe("free");
    expect(got.body.entitlements.source).toBe("free");
    expect(got.body.entitlements.capabilities.advanced_reports).toBe(false);
  });

  it("lar Free: relatório mensal liberado (200), anual bloqueado (402 PREMIUM_REQUIRED)", async () => {
    await authed(
      app,
      "get",
      `/households/${householdId}/reports/monthly`,
      owner.accessToken,
    ).expect(200);

    const blocked = await authed(
      app,
      "get",
      `/households/${householdId}/reports/annual`,
      owner.accessToken,
    ).expect(402);
    expect(blocked.body.code).toBe("PREMIUM_REQUIRED");
  });

  it("após virar premium (standard): relatório anual liberado (200) e capability true", async () => {
    await pool.query(
      `UPDATE public.subscriptions SET type = 'standard', status = 'active' WHERE household_id = $1`,
      [householdId],
    );

    await authed(
      app,
      "get",
      `/households/${householdId}/reports/annual`,
      owner.accessToken,
    ).expect(200);

    const got = await authed(
      app,
      "get",
      `/households/${householdId}/subscription`,
      owner.accessToken,
    ).expect(200);
    expect(got.body.entitlements.plan).toBe("premium");
    expect(got.body.entitlements.capabilities.advanced_reports).toBe(true);
  });

  it("comp (type=custom) também libera o relatório anual (200)", async () => {
    await pool.query(
      `UPDATE public.subscriptions SET type = 'custom', comp_reason = 'parceria' WHERE household_id = $1`,
      [householdId],
    );

    await authed(
      app,
      "get",
      `/households/${householdId}/reports/annual`,
      owner.accessToken,
    ).expect(200);

    const got = await authed(
      app,
      "get",
      `/households/${householdId}/subscription`,
      owner.accessToken,
    ).expect(200);
    expect(got.body.entitlements.plan).toBe("custom");
    expect(got.body.entitlements.source).toBe("comp");
  });
});
