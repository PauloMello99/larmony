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

/**
 * e2e do canal de suporte in-app (M15 PR3): criação/listagem/resposta do lado
 * do usuário, inbox e resposta do lado do admin, política de fechamento.
 */
describe("Support tickets (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let userA: TestUser;
  let userB: TestUser;
  let superAdmin: TestUser;

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();

    userA = await signUpUser(app, "support.a");
    userB = await signUpUser(app, "support.b");
    superAdmin = await signUpUser(app, "support.admin");
    await pool.query(
      `UPDATE public.users SET platform_role = 'super_admin' WHERE email = $1`,
      [superAdmin.email],
    );
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM public.support_tickets WHERE user_id IN (
      SELECT id FROM public.users WHERE email LIKE '%@e2e.larmony.local'
    )`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  it("cria um ticket → 201, status open, primeira mensagem gravada", async () => {
    const res = await authed(app, "post", "/support/tickets", userA.accessToken)
      .send({ category: "question", subject: "Como funciona X?", body: "Não entendi X." })
      .expect(201);

    expect(res.body.status).toBe("open");
    expect(res.body.category).toBe("question");
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.messages[0].isAdmin).toBe(false);
  });

  it("usuário vê o próprio ticket na listagem", async () => {
    await authed(app, "post", "/support/tickets", userA.accessToken)
      .send({ category: "problem", subject: "Bug no relatório", body: "Achei um bug." })
      .expect(201);

    const res = await authed(app, "get", "/support/tickets", userA.accessToken).expect(200);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
    expect(
      res.body.data.some((t: { subject: string }) => t.subject === "Bug no relatório"),
    ).toBe(true);
  });

  it("usuário B não enxerga ticket do usuário A → 404 (não vaza existência)", async () => {
    const created = await authed(app, "post", "/support/tickets", userA.accessToken)
      .send({ category: "suggestion", subject: "Sugestão privada de A", body: "Ideia." })
      .expect(201);

    await authed(app, "get", `/support/tickets/${created.body.id}`, userB.accessToken).expect(404);
  });

  it("não-admin não acessa a inbox do admin → 403", async () => {
    await authed(app, "get", "/admin/support/tickets", userA.accessToken).expect(403);
  });

  describe("fluxo completo: usuário abre → admin responde → usuário responde → admin fecha", () => {
    let ticketId: string;

    beforeAll(async () => {
      const created = await authed(app, "post", "/support/tickets", userA.accessToken)
        .send({ category: "billing", subject: "Dúvida de cobrança", body: "Fui cobrado 2x?" })
        .expect(201);
      ticketId = created.body.id;
    });

    it("admin vê o ticket na inbox", async () => {
      const res = await authed(
        app,
        "get",
        "/admin/support/tickets?status=open",
        superAdmin.accessToken,
      ).expect(200);
      expect(res.body.data.some((t: { id: string }) => t.id === ticketId)).toBe(true);
    });

    it("admin responde → status vira 'answered', 2ª mensagem is_admin=true", async () => {
      const res = await authed(
        app,
        "post",
        `/admin/support/tickets/${ticketId}/messages`,
        superAdmin.accessToken,
      )
        .send({ body: "Vamos verificar sua cobrança." })
        .expect(201);
      expect(res.body.isAdmin).toBe(true);

      const detail = await authed(
        app,
        "get",
        `/admin/support/tickets/${ticketId}`,
        superAdmin.accessToken,
      ).expect(200);
      expect(detail.body.status).toBe("answered");
      expect(detail.body.messages).toHaveLength(2);
    });

    it("usuário responde a um ticket 'answered' → reabre para 'open'", async () => {
      await authed(app, "post", `/support/tickets/${ticketId}/messages`, userA.accessToken)
        .send({ body: "Ainda não ficou claro, pode detalhar?" })
        .expect(201);

      const detail = await authed(
        app,
        "get",
        `/support/tickets/${ticketId}`,
        userA.accessToken,
      ).expect(200);
      expect(detail.body.status).toBe("open");
      expect(detail.body.messages).toHaveLength(3);
    });

    it("admin fecha o ticket via PATCH status", async () => {
      await authed(app, "patch", `/admin/support/tickets/${ticketId}/status`, superAdmin.accessToken)
        .send({ status: "closed" })
        .expect(200);

      const detail = await authed(
        app,
        "get",
        `/admin/support/tickets/${ticketId}`,
        superAdmin.accessToken,
      ).expect(200);
      expect(detail.body.status).toBe("closed");
    });

    it("ticket fechado + resposta do usuário → 409", async () => {
      await authed(app, "post", `/support/tickets/${ticketId}/messages`, userA.accessToken)
        .send({ body: "Reabrindo?" })
        .expect(409);
    });

    it("ticket fechado + resposta do admin → 409", async () => {
      await authed(app, "post", `/admin/support/tickets/${ticketId}/messages`, superAdmin.accessToken)
        .send({ body: "..." })
        .expect(409);
    });
  });
});
