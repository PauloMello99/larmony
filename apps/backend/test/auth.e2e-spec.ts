import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { Pool } from "pg";
import { adminPool, authed, cleanupByEmailPattern, createTestApp, signUpUser } from "./helpers";

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
      .send({ locale: "en" })
      .expect(200);
    expect(updated.body.locale).toBe("en");

    await authed(app, "patch", "/auth/me", user.accessToken)
      .send({ locale: "fr" })
      .expect(400);
  });
});
