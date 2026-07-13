import { INestApplication } from "@nestjs/common";
import { Pool } from "pg";
import { adminPool, authed, cleanupByEmailPattern, createTestApp, signUpUser, TestUser } from "./helpers";

describe("Goals (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let owner: TestUser;
  let householdId: string;
  let goalId: string;

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
    owner = await signUpUser(app, "goal.owner");

    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Metas" })
      .expect(201);
    householdId = created.body.id;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  it("cria uma meta e lista com savedCents derivado zero", async () => {
    const created = await authed(app, "post", `/households/${householdId}/goals`, owner.accessToken)
      .send({
        name: "Viagem",
        targetAmountCents: 500000,
        targetDate: "2026-12-20",
        color: "#06b6d4",
        description: "Férias no fim do ano",
      })
      .expect(201);

    goalId = created.body.id;
    expect(created.body.name).toBe("Viagem");
    expect(created.body.targetAmountCents).toBe(500000);

    const list = await authed(app, "get", `/households/${householdId}/goals`, owner.accessToken).expect(
      200,
    );
    const goal = list.body.find((g: { id: string }) => g.id === goalId);
    expect(goal).toBeDefined();
    expect(goal.savedCents).toBe(0);
    expect(goal.color).toBe("#06b6d4");
  });

  it("aportes somam no savedCents derivado e o histórico traz o autor", async () => {
    await authed(app, "post", `/households/${householdId}/goals/${goalId}/contributions`, owner.accessToken)
      .send({ amountCents: 100000, date: "2026-07-01" })
      .expect(201);
    await authed(app, "post", `/households/${householdId}/goals/${goalId}/contributions`, owner.accessToken)
      .send({ amountCents: 50000, date: "2026-07-05", notes: "13º" })
      .expect(201);

    const list = await authed(app, "get", `/households/${householdId}/goals`, owner.accessToken).expect(
      200,
    );
    const goal = list.body.find((g: { id: string }) => g.id === goalId);
    expect(goal.savedCents).toBe(150000);

    const contributions = await authed(
      app,
      "get",
      `/households/${householdId}/goals/${goalId}/contributions`,
      owner.accessToken,
    ).expect(200);
    expect(contributions.body).toHaveLength(2);
    expect(contributions.body[0].authorName).toBeTruthy();
    expect(contributions.body.map((c: { amountCents: number }) => c.amountCents).sort()).toEqual([
      100000, 50000,
    ].sort());
  });

  it("deletar um aporte faz o savedCents cair", async () => {
    const contributions = await authed(
      app,
      "get",
      `/households/${householdId}/goals/${goalId}/contributions`,
      owner.accessToken,
    ).expect(200);
    const smaller = contributions.body.find(
      (c: { amountCents: number }) => c.amountCents === 50000,
    );

    await authed(
      app,
      "delete",
      `/households/${householdId}/goals/${goalId}/contributions/${smaller.id}`,
      owner.accessToken,
    ).expect(204);

    const list = await authed(app, "get", `/households/${householdId}/goals`, owner.accessToken).expect(
      200,
    );
    const goal = list.body.find((g: { id: string }) => g.id === goalId);
    expect(goal.savedCents).toBe(100000);
  });

  it("aporte que atinge a meta dispara goal_reached 1x (dispatcher + dedup)", async () => {
    const created = await authed(app, "post", `/households/${householdId}/goals`, owner.accessToken)
      .send({
        name: "Reserva",
        targetAmountCents: 100000,
        color: "#22c55e",
      })
      .expect(201);
    const reachedGoalId = created.body.id;

    // Cruza o alvo — deve disparar goal_reached e gravar a notificação in-app.
    await authed(
      app,
      "post",
      `/households/${householdId}/goals/${reachedGoalId}/contributions`,
      owner.accessToken,
    )
      .send({ amountCents: 100000, date: "2026-07-01" })
      .expect(201);

    const rows = await pool.query(
      `SELECT id FROM public.notifications WHERE type = 'goal_reached' AND (data->>'goalId') = $1`,
      [reachedGoalId],
    );
    expect(rows.rows).toHaveLength(1);

    const dedupRows = await pool.query(
      `SELECT id FROM public.notification_dedup WHERE event_type = 'goal_reached' AND context_id = $1`,
      [reachedGoalId],
    );
    expect(dedupRows.rows).toHaveLength(1);

    // Um 2º aporte não re-dispara (dedup "once" já reivindicado).
    await authed(
      app,
      "post",
      `/households/${householdId}/goals/${reachedGoalId}/contributions`,
      owner.accessToken,
    )
      .send({ amountCents: 1000, date: "2026-07-02" })
      .expect(201);

    const rowsAfter = await pool.query(
      `SELECT id FROM public.notifications WHERE type = 'goal_reached' AND (data->>'goalId') = $1`,
      [reachedGoalId],
    );
    expect(rowsAfter.rows).toHaveLength(1);

    // Limpa — os testes seguintes assumem só a meta "Viagem" ativa no lar.
    await authed(app, "delete", `/households/${householdId}/goals/${reachedGoalId}`, owner.accessToken).expect(
      204,
    );
  });

  it("edita a meta, inclusive limpando a targetDate", async () => {
    const updated = await authed(
      app,
      "patch",
      `/households/${householdId}/goals/${goalId}`,
      owner.accessToken,
    )
      .send({ name: "Viagem Europa", targetAmountCents: 800000, targetDate: null })
      .expect(200);

    expect(updated.body.name).toBe("Viagem Europa");
    expect(updated.body.targetAmountCents).toBe(800000);
    expect(updated.body.targetDate).toBeNull();
  });

  it("overview traz goals.top com a meta e o total guardado", async () => {
    const overview = await authed(
      app,
      "get",
      `/households/${householdId}/overview`,
      owner.accessToken,
    ).expect(200);

    expect(overview.body.goals.savedCents).toBe(100000);
    expect(overview.body.goals.activeCount).toBe(1);
    const top = overview.body.goals.top.find((g: { id: string }) => g.id === goalId);
    expect(top).toBeDefined();
    expect(top.name).toBe("Viagem Europa");
    expect(top.savedCents).toBe(100000);
    expect(top.targetCents).toBe(800000);
  });

  it("deletar a meta apaga os aportes junto (cascade)", async () => {
    await authed(app, "delete", `/households/${householdId}/goals/${goalId}`, owner.accessToken).expect(
      204,
    );

    const list = await authed(app, "get", `/households/${householdId}/goals`, owner.accessToken).expect(
      200,
    );
    expect(list.body.find((g: { id: string }) => g.id === goalId)).toBeUndefined();

    const orphans = await pool.query(
      `SELECT count(*)::int AS n FROM public.goal_contributions WHERE goal_id = $1`,
      [goalId],
    );
    expect(orphans.rows[0].n).toBe(0);
  });

  it("não-membro recebe 403", async () => {
    const stranger = await signUpUser(app, "goal.stranger");
    await authed(app, "get", `/households/${householdId}/goals`, stranger.accessToken).expect(403);
  });

  it("limite de metas do Free (D-1, P-5): até 3 ok, a 4ª bloqueada (402), libera após upgrade", async () => {
    // Lar isolado (Free real) — não usa o `householdId` compartilhado.
    const solo = await signUpUser(app, "goal.limit.owner");
    const solo1 = await authed(app, "post", "/households", solo.accessToken)
      .send({ name: "E2E Lar Limite Metas" })
      .expect(201);
    const soloHouseholdId = solo1.body.id;

    for (let i = 1; i <= 3; i++) {
      await authed(app, "post", `/households/${soloHouseholdId}/goals`, solo.accessToken)
        .send({ name: `Meta ${i}`, targetAmountCents: 100000, color: "#06b6d4" })
        .expect(201);
    }

    const blocked = await authed(app, "post", `/households/${soloHouseholdId}/goals`, solo.accessToken)
      .send({ name: "Meta 4", targetAmountCents: 100000, color: "#06b6d4" })
      .expect(402);
    expect(blocked.body.code).toBe("GOAL_LIMIT_REACHED");

    await pool.query(
      `INSERT INTO public.subscriptions (household_id, type, status, comp_reason)
       VALUES ($1, 'custom', 'active', 'e2e limite de metas — upgrade')
       ON CONFLICT (household_id) DO UPDATE SET type = 'custom', comp_reason = EXCLUDED.comp_reason`,
      [soloHouseholdId],
    );
    await authed(app, "post", `/households/${soloHouseholdId}/goals`, solo.accessToken)
      .send({ name: "Meta 4", targetAmountCents: 100000, color: "#06b6d4" })
      .expect(201);
  });
});
