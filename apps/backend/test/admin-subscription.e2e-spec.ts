import { INestApplication } from "@nestjs/common";
import { Pool } from "pg";
import request from "supertest";
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

  describe("trial administrativo", () => {
    it("não-admin → 403", async () => {
      await authed(
        app,
        "post",
        `/admin/households/${householdId}/subscription/trial`,
        owner.accessToken,
      )
        .send({ months: 3 })
        .expect(403);
    });

    it("super_admin concede trial → trialing + entitlements premium/source trial", async () => {
      await authed(
        app,
        "post",
        `/admin/households/${householdId}/subscription/trial`,
        superAdmin.accessToken,
      )
        .send({ months: 3 })
        .expect(204);

      const got = await authed(
        app,
        "get",
        `/households/${householdId}/subscription`,
        owner.accessToken,
      ).expect(200);
      expect(got.body.type).toBe("trial");
      expect(got.body.status).toBe("trialing");
      expect(got.body.trialEndsAt).not.toBeNull();
      expect(got.body.entitlements.plan).toBe("premium");
      expect(got.body.entitlements.source).toBe("trial");
      expect(got.body.entitlements.capabilities.advanced_reports).toBe(true);
    });

    it("conceder trial sobre lar que já está em trial → 422 TRIAL_NOT_ALLOWED", async () => {
      const res = await authed(
        app,
        "post",
        `/admin/households/${householdId}/subscription/trial`,
        superAdmin.accessToken,
      )
        .send({ months: 1 })
        .expect(422);
      expect(res.body.code).toBe("TRIAL_NOT_ALLOWED");
    });

    it("revogar trial → volta a free", async () => {
      await authed(
        app,
        "delete",
        `/admin/households/${householdId}/subscription/trial`,
        superAdmin.accessToken,
      ).expect(204);

      const got = await authed(
        app,
        "get",
        `/households/${householdId}/subscription`,
        owner.accessToken,
      ).expect(200);
      expect(got.body.type).toBe("free");
      expect(got.body.trialEndsAt).toBeNull();
      expect(got.body.entitlements.source).toBe("free");
    });

    it("revogar trial de lar que não está em trial → 422", async () => {
      const res = await authed(
        app,
        "delete",
        `/admin/households/${householdId}/subscription/trial`,
        superAdmin.accessToken,
      ).expect(422);
      expect(res.body.code).toBe("TRIAL_NOT_ALLOWED");
    });
  });

  describe("billing-expiry-sweep (tick)", () => {
    const cronSecret = process.env["CRON_SECRET"] ?? "";
    const tick = () =>
      request(app.getHttpServer())
        .post("/internal/cron/tick")
        .set("x-cron-secret", cronSecret);

    it("comp com comp_expires_at no passado → sweep volta o lar para free", async () => {
      // Concede comp e vence a validade via SQL (o grant real não aceita passado).
      await authed(
        app,
        "post",
        `/admin/households/${householdId}/subscription/comp`,
        superAdmin.accessToken,
      )
        .send({ reason: "comp que vai vencer" })
        .expect(204);
      await pool.query(
        `UPDATE public.subscriptions SET comp_expires_at = now() - interval '1 day' WHERE household_id = $1`,
        [householdId],
      );

      await tick().expect(200);

      const got = await authed(
        app,
        "get",
        `/households/${householdId}/subscription`,
        owner.accessToken,
      ).expect(200);
      expect(got.body.type).toBe("free");
      expect(got.body.compReason).toBeNull();
    });

    it("trial com trial_ends_at no passado → sweep volta o lar para free", async () => {
      // Seed direto (o grant administrativo de trial é coberto nos casos do H-3).
      await pool.query(
        `UPDATE public.subscriptions
           SET type = 'trial', status = 'trialing', trial_ends_at = now() - interval '1 day'
         WHERE household_id = $1`,
        [householdId],
      );

      await tick().expect(200);

      const got = await authed(
        app,
        "get",
        `/households/${householdId}/subscription`,
        owner.accessToken,
      ).expect(200);
      expect(got.body.type).toBe("free");
      expect(got.body.status).toBe("active");
      expect(got.body.entitlements.capabilities.advanced_reports).toBe(false);
    });

    it("comp com validade futura NÃO é expirado pelo sweep", async () => {
      await authed(
        app,
        "post",
        `/admin/households/${householdId}/subscription/comp`,
        superAdmin.accessToken,
      )
        .send({ reason: "comp vigente", expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() })
        .expect(204);

      await tick().expect(200);

      const got = await authed(
        app,
        "get",
        `/households/${householdId}/subscription`,
        owner.accessToken,
      ).expect(200);
      expect(got.body.type).toBe("custom");

      // Limpa para não interferir noutros casos.
      await authed(
        app,
        "delete",
        `/admin/households/${householdId}/subscription/comp`,
        superAdmin.accessToken,
      ).expect(204);
    });
  });
});
