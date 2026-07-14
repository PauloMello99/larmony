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
 * e2e do painel da plataforma (AdminController) — M15. Primeira cobertura
 * destas rotas (a ausência dela deixou o 500 do stock_check_interval_days
 * passar despercebido em produção).
 */
describe("Admin platform panel (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let superAdmin: TestUser;
  let owner: TestUser;
  let householdId: string;
  let ownerUserId: string;
  let superAdminUserId: string;

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();

    superAdmin = await signUpUser(app, "plat.super");
    await pool.query(
      `UPDATE public.users SET platform_role = 'super_admin' WHERE email = $1`,
      [superAdmin.email],
    );

    owner = await signUpUser(app, "plat.owner");
    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Painel" })
      .expect(201);
    householdId = created.body.id;

    const ids = await pool.query<{ id: string; email: string }>(
      `SELECT id, email FROM public.users WHERE email IN ($1, $2)`,
      [owner.email, superAdmin.email],
    );
    ownerUserId = ids.rows.find((r) => r.email === owner.email)!.id;
    superAdminUserId = ids.rows.find((r) => r.email === superAdmin.email)!.id;

    // Seed das abas de finanças/notificações (SQL direto — as abas são
    // read-only; o que importa é o shape/paginação, não o caminho de escrita).
    const cat = await pool.query<{ id: string }>(
      `SELECT id FROM public.categories WHERE household_id = $1 LIMIT 1`,
      [householdId],
    );
    const categoryId = cat.rows[0]!.id;

    await pool.query(
      `INSERT INTO public.transactions (household_id, created_by, category_id, type, amount_cents, description, date)
       VALUES ($1, $2, $3, 'expense', 4200, 'E2E mercado', '2026-07-01'),
              ($1, $2, $3, 'income', 100000, 'E2E salário', '2026-07-05')`,
      [householdId, ownerUserId, categoryId],
    );
    await pool.query(
      `INSERT INTO public.goals (household_id, name, target_amount_cents) VALUES ($1, 'E2E meta', 50000)`,
      [householdId],
    );
    const budget = await pool.query<{ id: string }>(
      `INSERT INTO public.budgets (household_id, category_id) VALUES ($1, $2) RETURNING id`,
      [householdId, categoryId],
    );
    await pool.query(
      `INSERT INTO public.budget_versions (budget_id, amount_cents, effective_from)
       VALUES ($1, 30000, date_trunc('month', CURRENT_DATE)::date)`,
      [budget.rows[0]!.id],
    );
    await pool.query(
      `INSERT INTO public.scheduled_transaction_entries
         (household_id, posting_mode, created_by, type, amount_cents, description, frequency, start_date)
       VALUES ($1, 'manual', $2, 'expense', 9900, 'E2E aluguel', 'monthly', '2026-08-01')`,
      [householdId, ownerUserId],
    );
    await pool.query(
      `INSERT INTO public.notifications (user_id, household_id, type, title, body)
       VALUES ($1, $2, 'monthly_report', 'E2E notif', 'corpo')`,
      [ownerUserId, householdId],
    );
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  describe("guard: não-super_admin → 403 em toda rota do painel", () => {
    const routes: Array<[string, string]> = [
      ["get", "/admin/stats"],
      ["get", "/admin/stats/growth"],
      ["get", "/admin/households"],
      ["get", "/admin/users"],
      ["get", "/admin/audit-logs"],
    ];
    it.each(routes)("%s %s → 403", async (method, url) => {
      await authed(app, method as "get", url, owner.accessToken).expect(403);
    });

    it("rotas com :id e o suspend → 403", async () => {
      await authed(app, "get", `/admin/households/${householdId}`, owner.accessToken).expect(403);
      await authed(
        app,
        "get",
        `/admin/households/${householdId}/transactions`,
        owner.accessToken,
      ).expect(403);
      await authed(app, "patch", `/admin/households/${householdId}/suspend`, owner.accessToken)
        .send({ suspended: true })
        .expect(403);
    });
  });

  it("stats retorna os contadores da plataforma", async () => {
    const res = await authed(app, "get", "/admin/stats", superAdmin.accessToken).expect(200);
    expect(res.body.totalHouseholds).toBeGreaterThanOrEqual(1);
    expect(res.body.totalUsers).toBeGreaterThanOrEqual(2);
    expect(res.body.superAdmins).toBeGreaterThanOrEqual(1);
  });

  describe("lista de lares (server-side)", () => {
    it("envelope de paginação + linha com owner/plan", async () => {
      const res = await authed(
        app,
        "get",
        `/admin/households?q=E2E Lar Painel`,
        superAdmin.accessToken,
      ).expect(200);
      expect(res.body).toMatchObject({ total: 1, page: 1, pages: 1 });
      const row = res.body.data[0];
      expect(row.name).toBe("E2E Lar Painel");
      expect(row.ownerEmail).toBe(owner.email);
      // Sem linha de subscription ainda (lazy) → plan free por COALESCE.
      expect(row.plan).toBe("free");
    });

    it("q acha o lar pelo E-MAIL do dono", async () => {
      const res = await authed(
        app,
        "get",
        `/admin/households?q=${encodeURIComponent(owner.email)}`,
        superAdmin.accessToken,
      ).expect(200);
      expect(res.body.data.some((r: { id: string }) => r.id === householdId)).toBe(true);
    });

    it("filtro plan=custom não inclui o lar free", async () => {
      const res = await authed(
        app,
        "get",
        `/admin/households?q=E2E Lar Painel&plan=custom`,
        superAdmin.accessToken,
      ).expect(200);
      expect(res.body.total).toBe(0);
    });

    it("paginação: limit=1 fatia e reporta pages corretamente", async () => {
      const res = await authed(
        app,
        "get",
        `/admin/households?limit=1&page=1`,
        superAdmin.accessToken,
      ).expect(200);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
      expect(res.body.pages).toBe(Math.ceil(res.body.total / 1));
    });
  });

  describe("detalhe do lar", () => {
    it("payload com settings (timezone/notificationHour), membros e subscription null (nunca tocou billing)", async () => {
      const res = await authed(
        app,
        "get",
        `/admin/households/${householdId}`,
        superAdmin.accessToken,
      ).expect(200);
      expect(res.body.name).toBe("E2E Lar Painel");
      expect(typeof res.body.timezone).toBe("string");
      expect(typeof res.body.notificationHour).toBe("number");
      expect(res.body.owner.email).toBe(owner.email);
      expect(res.body.members.length).toBe(1);
      expect(res.body.subscription).toBeNull();
    });

    it("após a linha lazy de subscription, o bloco aparece como free/active", async () => {
      await authed(
        app,
        "get",
        `/households/${householdId}/subscription`,
        owner.accessToken,
      ).expect(200);
      const res = await authed(
        app,
        "get",
        `/admin/households/${householdId}`,
        superAdmin.accessToken,
      ).expect(200);
      expect(res.body.subscription).toMatchObject({ type: "free", status: "active" });
    });

    it("lar inexistente → 404", async () => {
      await authed(
        app,
        "get",
        `/admin/households/00000000-0000-0000-0000-000000000000`,
        superAdmin.accessToken,
      ).expect(404);
    });
  });

  describe("abas de drill-down", () => {
    it("transactions com envelope, joins e filtro de type", async () => {
      const res = await authed(
        app,
        "get",
        `/admin/households/${householdId}/transactions`,
        superAdmin.accessToken,
      ).expect(200);
      expect(res.body.total).toBe(2);
      const expense = res.body.data.find((t: { type: string }) => t.type === "expense");
      expect(expense).toMatchObject({ description: "E2E mercado", amountCents: 4200 });
      expect(expense.categoryName).not.toBeNull();
      expect(expense.createdByName).not.toBeNull();

      const filtered = await authed(
        app,
        "get",
        `/admin/households/${householdId}/transactions?type=income`,
        superAdmin.accessToken,
      ).expect(200);
      expect(filtered.body.total).toBe(1);
      expect(filtered.body.data[0].description).toBe("E2E salário");
    });

    it("categories traz as 13 padrão do onboarding", async () => {
      const res = await authed(
        app,
        "get",
        `/admin/households/${householdId}/categories?limit=100`,
        superAdmin.accessToken,
      ).expect(200);
      expect(res.body.total).toBe(13);
      expect(res.body.data.every((c: { isDefault: boolean }) => c.isDefault)).toBe(true);
    });

    it("budgets resolve o limite vigente da versão", async () => {
      const res = await authed(
        app,
        "get",
        `/admin/households/${householdId}/budgets`,
        superAdmin.accessToken,
      ).expect(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0]).toMatchObject({ currentAmountCents: 30000, endedFrom: null });
      expect(res.body.data[0].categoryName).not.toBeNull();
    });

    it("goals deriva o acumulado (0 sem contribuições)", async () => {
      const res = await authed(
        app,
        "get",
        `/admin/households/${householdId}/goals`,
        superAdmin.accessToken,
      ).expect(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0]).toMatchObject({
        name: "E2E meta",
        targetAmountCents: 50000,
        currentAmountCents: 0,
      });
    });

    it("scheduled-entries lista a entrada manual", async () => {
      const res = await authed(
        app,
        "get",
        `/admin/households/${householdId}/scheduled-entries`,
        superAdmin.accessToken,
      ).expect(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0]).toMatchObject({
        description: "E2E aluguel",
        postingMode: "manual",
        nextRunDate: null,
      });
    });

    it("notifications lista com destinatário; filtro de type fora do enum → vazio (sem 500)", async () => {
      const res = await authed(
        app,
        "get",
        `/admin/households/${householdId}/notifications`,
        superAdmin.accessToken,
      ).expect(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0]).toMatchObject({ title: "E2E notif", userId: ownerUserId });

      const none = await authed(
        app,
        "get",
        `/admin/households/${householdId}/notifications?type=nao_existe`,
        superAdmin.accessToken,
      ).expect(200);
      expect(none.body.total).toBe(0);
    });

    it("aba de lar inexistente → 404 PLATFORM_TARGET_NOT_FOUND", async () => {
      const res = await authed(
        app,
        "get",
        `/admin/households/00000000-0000-0000-0000-000000000000/goals`,
        superAdmin.accessToken,
      ).expect(404);
      expect(res.body.code).toBe("PLATFORM_TARGET_NOT_FOUND");
    });
  });

  describe("lista de usuários (server-side)", () => {
    it("q por e-mail + chips de lares", async () => {
      const res = await authed(
        app,
        "get",
        `/admin/users?q=${encodeURIComponent(owner.email)}`,
        superAdmin.accessToken,
      ).expect(200);
      expect(res.body.total).toBe(1);
      const row = res.body.data[0];
      expect(row.email).toBe(owner.email);
      expect(row.households).toEqual([
        expect.objectContaining({ id: householdId, name: "E2E Lar Painel", role: "owner" }),
      ]);
    });

    it("filtro platformRole=super_admin não traz o dono comum", async () => {
      const res = await authed(
        app,
        "get",
        `/admin/users?q=${encodeURIComponent(owner.email)}&platformRole=super_admin`,
        superAdmin.accessToken,
      ).expect(200);
      expect(res.body.total).toBe(0);
    });
  });

  it("rota removida de platform-role → 404", async () => {
    await authed(app, "patch", `/admin/users/${ownerUserId}/platform-role`, superAdmin.accessToken)
      .send({ role: "super_admin" })
      .expect(404);
  });

  describe("política de suspensão", () => {
    it("lar free suspende e reativa direto", async () => {
      await authed(app, "patch", `/admin/households/${householdId}/suspend`, superAdmin.accessToken)
        .send({ suspended: true })
        .expect(204);
      let detail = await authed(
        app,
        "get",
        `/admin/households/${householdId}`,
        superAdmin.accessToken,
      ).expect(200);
      expect(detail.body.suspendedAt).not.toBeNull();

      await authed(app, "patch", `/admin/households/${householdId}/suspend`, superAdmin.accessToken)
        .send({ suspended: false })
        .expect(204);
      detail = await authed(
        app,
        "get",
        `/admin/households/${householdId}`,
        superAdmin.accessToken,
      ).expect(200);
      expect(detail.body.suspendedAt).toBeNull();
    });

    it("lar pago sem o flag → 409; com o flag cancela (idempotente no Stripe) e suspende", async () => {
      // Simula lar pago: sub standard/active com um sub id que não existe no
      // Stripe — o cancel do gateway é idempotente (resource_missing engolido),
      // então o fluxo real roda de ponta a ponta contra o Stripe test.
      await pool.query(
        `UPDATE public.subscriptions
           SET type = 'standard', status = 'active', stripe_subscription_id = 'sub_e2e_platform_fake'
         WHERE household_id = $1`,
        [householdId],
      );

      const conflict = await authed(
        app,
        "patch",
        `/admin/households/${householdId}/suspend`,
        superAdmin.accessToken,
      )
        .send({ suspended: true })
        .expect(409);
      expect(conflict.body.code).toBe("HOUSEHOLD_HAS_ACTIVE_SUBSCRIPTION");

      await authed(app, "patch", `/admin/households/${householdId}/suspend`, superAdmin.accessToken)
        .send({ suspended: true, cancelStripeSubscription: true })
        .expect(204);

      const detail = await authed(
        app,
        "get",
        `/admin/households/${householdId}`,
        superAdmin.accessToken,
      ).expect(200);
      expect(detail.body.suspendedAt).not.toBeNull();
      expect(detail.body.subscription).toMatchObject({ type: "free", status: "canceled" });

      // Membro comum bloqueado no lar suspenso.
      await authed(app, "get", `/households/${householdId}/subscription`, owner.accessToken).expect(
        403,
      );

      // Reativa para os asserts de auditoria.
      await authed(app, "patch", `/admin/households/${householdId}/suspend`, superAdmin.accessToken)
        .send({ suspended: false })
        .expect(204);
    });
  });

  describe("audit-logs (filtros que a UI passa a expor)", () => {
    it("householdId traz os suspend/unsuspend com canceledStripe no metadata", async () => {
      const res = await authed(
        app,
        "get",
        `/admin/audit-logs?householdId=${householdId}`,
        superAdmin.accessToken,
      ).expect(200);
      const ops = res.body.data.map(
        (l: { metadata: { operation?: string; canceledStripe?: boolean } }) => l.metadata,
      );
      expect(ops).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ operation: "suspend", canceledStripe: true }),
          expect.objectContaining({ operation: "unsuspend" }),
        ]),
      );
    });

    it("actorId filtra pelo super_admin", async () => {
      const res = await authed(
        app,
        "get",
        `/admin/audit-logs?actorId=${superAdminUserId}&householdId=${householdId}`,
        superAdmin.accessToken,
      ).expect(200);
      expect(res.body.total).toBeGreaterThanOrEqual(3);
      expect(
        res.body.data.every((l: { actor: { id: string } }) => l.actor.id === superAdminUserId),
      ).toBe(true);
    });
  });

  // Posicionado por último de propósito: flipa a subscription do lar-alvo
  // (linha lazy, criada só no 1º acesso à assinatura) por vários cenários —
  // rodar antes quebraria os testes que assumem `subscription: null` /
  // `plan: "free"` pré-lazy nos describes anteriores.
  describe("stats de billing (M15 PR2) — MRR normaliza intervalo + desconto", () => {
    afterAll(async () => {
      await pool.query(
        `UPDATE public.subscriptions SET type='free', status='active', price_cents=NULL, billing_interval=NULL, discount_percent=NULL WHERE household_id = $1`,
        [householdId],
      );
    });

    it("standard/active mensal sem desconto → payingActive=1 e MRR = price_cents", async () => {
      await pool.query(
        `UPDATE public.subscriptions SET type='standard', status='active', price_cents=1490, billing_interval='monthly', discount_percent=NULL WHERE household_id = $1`,
        [householdId],
      );
      const res = await authed(app, "get", "/admin/stats/billing", superAdmin.accessToken).expect(
        200,
      );
      expect(res.body.payingActive).toBeGreaterThanOrEqual(1);
      expect(res.body.approxMrrCents).toBeGreaterThanOrEqual(1490);
      expect(
        res.body.planDistribution.find((p: { plan: string }) => p.plan === "standard").count,
      ).toBeGreaterThanOrEqual(1);
    });

    it("anual normaliza para 1/12 do preço (MRR aproximado)", async () => {
      // Isola: zera o mensal do teste anterior antes de medir o efeito do anual.
      await pool.query(
        `UPDATE public.subscriptions SET type='free', status='active', price_cents=NULL, billing_interval=NULL WHERE household_id = $1`,
        [householdId],
      );
      const before = (
        await authed(app, "get", "/admin/stats/billing", superAdmin.accessToken).expect(200)
      ).body.approxMrrCents;

      await pool.query(
        `UPDATE public.subscriptions SET type='standard', status='active', price_cents=14900, billing_interval='annual', discount_percent=NULL WHERE household_id = $1`,
        [householdId],
      );
      const after = (
        await authed(app, "get", "/admin/stats/billing", superAdmin.accessToken).expect(200)
      ).body.approxMrrCents;

      // 14900/12 ≈ 1242 (SUM(::int) arredonda) — aceita a vizinhança pelo
      // arredondamento do Postgres, não trunca.
      expect(after - before).toBeGreaterThanOrEqual(1240);
      expect(after - before).toBeLessThanOrEqual(1242);
    });

    it("desconto percentual reduz o MRR proporcionalmente (delta, não valor absoluto — a suíte completa pode ter outros lares standard)", async () => {
      await pool.query(
        `UPDATE public.subscriptions SET type='free', status='active', price_cents=NULL, billing_interval=NULL, discount_percent=NULL WHERE household_id = $1`,
        [householdId],
      );
      const before = (
        await authed(app, "get", "/admin/stats/billing", superAdmin.accessToken).expect(200)
      ).body.approxMrrCents;

      await pool.query(
        `UPDATE public.subscriptions SET type='standard', status='active', price_cents=1490, billing_interval='monthly', discount_percent=20 WHERE household_id = $1`,
        [householdId],
      );
      const after = (
        await authed(app, "get", "/admin/stats/billing", superAdmin.accessToken).expect(200)
      ).body.approxMrrCents;

      // 1490 * 0.8 = 1192.
      expect(after - before).toBe(1192);
    });

    it("past_due e canceled contam nos buckets certos, não em payingActive", async () => {
      await pool.query(
        `UPDATE public.subscriptions SET type='standard', status='past_due', price_cents=1490, billing_interval='monthly', discount_percent=NULL WHERE household_id = $1`,
        [householdId],
      );
      let res = await authed(app, "get", "/admin/stats/billing", superAdmin.accessToken).expect(
        200,
      );
      expect(res.body.pastDue).toBeGreaterThanOrEqual(1);

      await pool.query(
        `UPDATE public.subscriptions SET status='canceled' WHERE household_id = $1`,
        [householdId],
      );
      res = await authed(app, "get", "/admin/stats/billing", superAdmin.accessToken).expect(200);
      expect(res.body.canceled).toBeGreaterThanOrEqual(1);
    });
  });
});
