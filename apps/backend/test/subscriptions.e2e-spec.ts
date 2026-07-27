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

describe("Subscriptions (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let owner: TestUser;
  let member: TestUser;
  let householdId: string;

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
    owner = await signUpUser(app, "sub.owner");

    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Assinatura" })
      .expect(201);
    householdId = created.body.id;

    // Convida e aceita um segundo membro (não-owner) para os testes de 403.
    member = await signUpUser(app, "sub.member");
    await authed(app, "post", `/households/${householdId}/members/invite`, owner.accessToken)
      .send({ email: member.email })
      .expect(201);
    const tokenRow = await pool.query(
      `SELECT token FROM public.household_invitations WHERE household_id = $1 AND email = $2 AND status = 'pending'`,
      [householdId, member.email],
    );
    await authed(app, "post", "/invitations/accept", member.accessToken)
      .send({ token: tokenRow.rows[0]?.token, dataSharingAcknowledged: true })
      .expect((res) => expect([200, 201]).toContain(res.status));
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  it("GET retorna free/active logo após criar o household (getOrCreate)", async () => {
    const res = await authed(
      app,
      "get",
      `/households/${householdId}/subscription`,
      owner.accessToken,
    ).expect(200);

    expect(res.body.type).toBe("free");
    expect(res.body.status).toBe("active");
    expect(res.body.stripeCustomerId).toBeNull();
  });

  it("membro não-owner recebe 403 em checkout e portal", async () => {
    await authed(
      app,
      "post",
      `/households/${householdId}/subscription/checkout`,
      member.accessToken,
    ).expect(403);

    await authed(
      app,
      "post",
      `/households/${householdId}/subscription/portal`,
      member.accessToken,
    ).expect(403);
  });

  it("owner sem customer Stripe ainda recebe 422 (NO_STRIPE_CUSTOMER) no portal", async () => {
    const res = await authed(
      app,
      "post",
      `/households/${householdId}/subscription/portal`,
      owner.accessToken,
    ).expect(422);

    expect(res.body.code).toBe("NO_STRIPE_CUSTOMER");
  });

  it("owner em checkout recebe uma URL real do Stripe (test mode) e cria o customer", async () => {
    const res = await authed(
      app,
      "post",
      `/households/${householdId}/subscription/checkout`,
      owner.accessToken,
    ).expect(201);

    expect(res.body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);

    const got = await authed(
      app,
      "get",
      `/households/${householdId}/subscription`,
      owner.accessToken,
    ).expect(200);
    expect(got.body.stripeCustomerId).toMatch(/^cus_/);
  });

  it("owner em portal, já com customer, recebe uma URL real do Billing Portal", async () => {
    const res = await authed(
      app,
      "post",
      `/households/${householdId}/subscription/portal`,
      owner.accessToken,
    ).expect(201);

    expect(res.body.url).toMatch(/^https:\/\/billing\.stripe\.com\//);
  });

  it("segundo checkout do mesmo household reusa o customer já criado", async () => {
    const before = await authed(
      app,
      "get",
      `/households/${householdId}/subscription`,
      owner.accessToken,
    ).expect(200);

    const res = await authed(
      app,
      "post",
      `/households/${householdId}/subscription/checkout`,
      owner.accessToken,
    ).expect(201);
    expect(res.body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);

    const after = await authed(
      app,
      "get",
      `/households/${householdId}/subscription`,
      owner.accessToken,
    ).expect(200);
    expect(after.body.stripeCustomerId).toBe(before.body.stripeCustomerId);
  });

  describe("trial self-serve + seleção de plano (M16)", () => {
    it("1º checkout concede trial (marca trial_consumed) e aceita planKey explícito", async () => {
      const solo = await signUpUser(app, "sub.trial.owner");
      const created = await authed(app, "post", "/households", solo.accessToken)
        .send({ name: "E2E Lar Trial" })
        .expect(201);
      const soloHouseholdId = created.body.id;

      const before = await pool.query(
        `SELECT trial_consumed FROM public.subscriptions WHERE household_id = $1`,
        [soloHouseholdId],
      );
      // Linha ainda não existe (getOrCreate lazy) — trial_consumed é false por padrão.
      expect(before.rows[0]?.trial_consumed ?? false).toBe(false);

      const res = await authed(
        app,
        "post",
        `/households/${soloHouseholdId}/subscription/checkout`,
        solo.accessToken,
      )
        .send({ planKey: "essencial_monthly" })
        .expect(201);
      expect(res.body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);

      const after = await pool.query(
        `SELECT trial_consumed FROM public.subscriptions WHERE household_id = $1`,
        [soloHouseholdId],
      );
      expect(after.rows[0].trial_consumed).toBe(true);
    });

    it("planKey inválido → 400 (validação do DTO)", async () => {
      await authed(
        app,
        "post",
        `/households/${householdId}/subscription/checkout`,
        owner.accessToken,
      )
        .send({ planKey: "plano-inexistente" })
        .expect(400);
    });
  });
});
