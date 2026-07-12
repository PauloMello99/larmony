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

describe("Admin subscription comp/discount (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let superAdmin: TestUser;
  let owner: TestUser;
  let householdId: string;

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();

    // super_admin (eleva via SQL — o guard lê o role do banco, não do token).
    superAdmin = await signUpUser(app, "adm.super");
    await pool.query(
      `UPDATE public.users SET platform_role = 'super_admin' WHERE email = $1`,
      [superAdmin.email],
    );

    // Dono de um lar-alvo (usuário comum).
    owner = await signUpUser(app, "adm.owner");
    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Admin Billing" })
      .expect(201);
    householdId = created.body.id;
    // Garante a linha de subscription (default free).
    await authed(app, "get", `/households/${householdId}/subscription`, owner.accessToken).expect(200);
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  it("não-admin (dono) → 403 ao conceder isenção", async () => {
    await authed(
      app,
      "post",
      `/admin/households/${householdId}/subscription/comp`,
      owner.accessToken,
    )
      .send({ reason: "tentativa" })
      .expect(403);
  });

  it("super_admin concede isenção → lar vira custom/active com compReason e entitlements premium", async () => {
    await authed(
      app,
      "post",
      `/admin/households/${householdId}/subscription/comp`,
      superAdmin.accessToken,
    )
      .send({ reason: "parceria estratégica" })
      .expect(204);

    const got = await authed(
      app,
      "get",
      `/households/${householdId}/subscription`,
      owner.accessToken,
    ).expect(200);
    expect(got.body.type).toBe("custom");
    expect(got.body.status).toBe("active");
    expect(got.body.compReason).toBe("parceria estratégica");
    expect(got.body.entitlements.plan).toBe("custom");
    expect(got.body.entitlements.source).toBe("comp");
    expect(got.body.entitlements.capabilities.advanced_reports).toBe(true);
  });

  it("super_admin revoga isenção → lar volta a free e compReason some", async () => {
    await authed(
      app,
      "delete",
      `/admin/households/${householdId}/subscription/comp`,
      superAdmin.accessToken,
    ).expect(204);

    const got = await authed(
      app,
      "get",
      `/households/${householdId}/subscription`,
      owner.accessToken,
    ).expect(200);
    expect(got.body.type).toBe("free");
    expect(got.body.compReason).toBeNull();
  });

  it("desconto num lar sem sub Stripe → 422 SUBSCRIPTION_NOT_STRIPE_LINKED", async () => {
    const res = await authed(
      app,
      "post",
      `/admin/households/${householdId}/subscription/discount`,
      superAdmin.accessToken,
    )
      .send({ percent: 20, duration: "once" })
      .expect(422);
    expect(res.body.code).toBe("SUBSCRIPTION_NOT_STRIPE_LINKED");
  });

  it("desconto com percent + amountCents juntos → 422 INVALID_DISCOUNT", async () => {
    const res = await authed(
      app,
      "post",
      `/admin/households/${householdId}/subscription/discount`,
      superAdmin.accessToken,
    )
      .send({ percent: 10, amountCents: 100, duration: "once" })
      .expect(422);
    expect(res.body.code).toBe("INVALID_DISCOUNT");
  });
});
