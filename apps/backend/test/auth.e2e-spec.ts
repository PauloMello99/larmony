import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { Pool } from "pg";
import { adminPool, authed, cleanupByEmailPattern, createTestApp, signUpUser } from "./helpers";
import { TERMS_VERSION } from "../src/modules/auth/terms-version";

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
  });

  afterAll(async () => {
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  it("sign-up cria a conta e devolve sessão; e-mail duplicado é rejeitado", async () => {
    const user = await signUpUser(app, "auth");
    expect(user.accessToken).toBeTruthy();

    await request(app.getHttpServer())
      .post("/auth/sign-up")
      .send({ name: "Dup", email: user.email, password: user.password, termsAccepted: true })
      .expect((res) => expect(res.status).toBeGreaterThanOrEqual(400));
  });

  it("sign-up sem aceite dos termos → 400 (LGPD); com aceite grava versão+timestamp", async () => {
    await request(app.getHttpServer())
      .post("/auth/sign-up")
      .send({
        name: "Sem Aceite",
        email: `sem.aceite.${Date.now()}@e2e.larmony.local`,
        password: "SenhaForteE2e123!",
      })
      .expect(400);

    const user = await signUpUser(app, "auth.terms"); // helper envia termsAccepted: true
    const row = await pool.query(
      `SELECT terms_accepted_at, terms_version FROM public.users WHERE email = $1`,
      [user.email],
    );
    expect(row.rows[0].terms_accepted_at).not.toBeNull();
    expect(row.rows[0].terms_version).toBeTruthy();
  });

  it("sign-in autentica com credenciais corretas e rejeita senha errada", async () => {
    const user = await signUpUser(app, "auth");

    const ok = await request(app.getHttpServer())
      .post("/auth/sign-in")
      .send({ email: user.email, password: user.password })
      .expect(201);
    expect(ok.body.session?.accessToken ?? ok.body.accessToken).toBeTruthy();

    await request(app.getHttpServer())
      .post("/auth/sign-in")
      .send({ email: user.email, password: "senha-errada-123!" })
      .expect(401);
  });

  it("GET /auth/me exige token e devolve o perfil com locale default pt-BR", async () => {
    await request(app.getHttpServer()).get("/auth/me").expect(401);

    const user = await signUpUser(app, "auth");
    const me = await authed(app, "get", "/auth/me", user.accessToken).expect(200);
    expect(me.body.email).toBe(user.email);
    expect(me.body.locale).toBe("pt-BR");
  });

  it("PATCH /auth/me troca o locale (ADR-0018) e valida a whitelist", async () => {
    const user = await signUpUser(app, "auth");

    const updated = await authed(app, "patch", "/auth/me", user.accessToken)
      .send({ locale: "en-US" })
      .expect(200);
    expect(updated.body.locale).toBe("en-US");

    await authed(app, "patch", "/auth/me", user.accessToken)
      .send({ locale: "xx-XX" })
      .expect(400);
  });

  it("GET /auth/me devolve termsVersion=TERMS_VERSION e termsAcceptanceRequired=false logo após o signup", async () => {
    const user = await signUpUser(app, "terms.fresh");
    const me = await authed(app, "get", "/auth/me", user.accessToken).expect(200);
    expect(me.body.termsVersion).toBe(TERMS_VERSION);
    expect(me.body.termsAcceptanceRequired).toBe(false);
  });

  it("GET /auth/me devolve termsAcceptanceRequired=true quando terms_version está desatualizado ou nulo", async () => {
    const user = await signUpUser(app, "terms.stale");
    await pool.query(`UPDATE public.users SET terms_version = '2020-01-01' WHERE email = $1`, [
      user.email,
    ]);
    const staleRes = await authed(app, "get", "/auth/me", user.accessToken).expect(200);
    expect(staleRes.body.termsAcceptanceRequired).toBe(true);

    await pool.query(`UPDATE public.users SET terms_version = NULL WHERE email = $1`, [
      user.email,
    ]);
    const nullRes = await authed(app, "get", "/auth/me", user.accessToken).expect(200);
    expect(nullRes.body.termsAcceptanceRequired).toBe(true);
  });

  it("POST /auth/me/accept-terms exige token e grava o re-aceite com audit log", async () => {
    await request(app.getHttpServer()).post("/auth/me/accept-terms").expect(401);

    const user = await signUpUser(app, "terms.reaccept");
    await pool.query(`UPDATE public.users SET terms_version = '2020-01-01' WHERE email = $1`, [
      user.email,
    ]);

    await authed(app, "post", "/auth/me/accept-terms", user.accessToken).expect(201);

    const row = await pool.query(
      `SELECT id, terms_version, terms_accepted_at FROM public.users WHERE email = $1`,
      [user.email],
    );
    expect(row.rows[0].terms_version).toBe(TERMS_VERSION);
    expect(row.rows[0].terms_accepted_at).not.toBeNull();

    const afterRes = await authed(app, "get", "/auth/me", user.accessToken).expect(200);
    expect(afterRes.body.termsAcceptanceRequired).toBe(false);

    // user.userId (do corpo do sign-up) é o authId do provedor — o audit log
    // grava actor_id = public.users.id, por isso buscamos o id real aqui.
    const audit = await pool.query(
      `SELECT action, entity_type, metadata FROM public.audit_logs WHERE actor_id = $1 AND entity_type = 'terms_acceptance' ORDER BY created_at DESC LIMIT 1`,
      [row.rows[0].id],
    );
    expect(audit.rows[0]).toBeDefined();
    expect(audit.rows[0].action).toBe("update");
    expect(audit.rows[0].metadata.termsVersion).toBe(TERMS_VERSION);
    expect(audit.rows[0].metadata.previousVersion).toBe("2020-01-01");
  });
});
