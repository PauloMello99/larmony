import { INestApplication } from "@nestjs/common";
import { Pool } from "pg";
import { adminPool, authed, cleanupByEmailPattern, createTestApp, signUpUser, TestUser } from "./helpers";

/** Mês/ano (1-12/YYYY) do mês corrente do processo de teste — mesma âncora do backend. */
function currentPeriod(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function isoDate(period: { month: number; year: number }, day = 15): string {
  return `${period.year}-${String(period.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

describe("Notifications preferences + dispatch (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let owner: TestUser;
  let householdId: string;
  let categoryId: string;

  const current = currentPeriod();

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
    owner = await signUpUser(app, "notif.owner");

    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Notificacoes" })
      .expect(201);
    householdId = created.body.id;

    const categories = await authed(
      app,
      "get",
      `/households/${householdId}/categories`,
      owner.accessToken,
    ).expect(200);
    categoryId = categories.body.find((c: { name: string }) => c.name === "Alimentação").id;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  it("GET retorna a matriz default (e-mail on, sms/whatsapp off) para os 5 eventos configuráveis", async () => {
    const res = await authed(
      app,
      "get",
      "/me/notification-preferences",
      owner.accessToken,
    ).expect(200);

    expect(res.body).toHaveLength(5);
    const eventTypes = res.body.map((r: { eventType: string }) => r.eventType).sort();
    expect(eventTypes).toEqual(
      ["auto_launch", "bill_reminder", "budget_exceeded", "goal_reached", "monthly_report"].sort(),
    );
    for (const row of res.body) {
      expect(row.email).toBe(true);
      expect(row.sms).toBe(false);
      expect(row.whatsapp).toBe(false);
    }
  });

  it("PUT atualiza uma célula e o GET seguinte reflete só ela", async () => {
    await authed(app, "put", "/me/notification-preferences", owner.accessToken)
      .send({ eventType: "goal_reached", channel: "email", enabled: false })
      .expect(204);

    const res = await authed(
      app,
      "get",
      "/me/notification-preferences",
      owner.accessToken,
    ).expect(200);

    const goalReached = res.body.find((r: { eventType: string }) => r.eventType === "goal_reached");
    expect(goalReached.email).toBe(false);
    const billReminder = res.body.find((r: { eventType: string }) => r.eventType === "bill_reminder");
    expect(billReminder.email).toBe(true); // outras células não afetadas
  });

  it("preferência de e-mail desligada NÃO suprime o registro in-app (goal_reached)", async () => {
    const goal = await authed(app, "post", `/households/${householdId}/goals`, owner.accessToken)
      .send({ name: "Meta sem e-mail", targetAmountCents: 50000, color: "#f97316" })
      .expect(201);

    // Preferência de e-mail para goal_reached já está off (teste anterior) —
    // o dispatcher grava o in-app independentemente do canal escolhido.
    await authed(
      app,
      "post",
      `/households/${householdId}/goals/${goal.body.id}/contributions`,
      owner.accessToken,
    )
      .send({ amountCents: 50000, date: isoDate(current, 1) })
      .expect(201);

    const rows = await pool.query(
      `SELECT id FROM public.notifications WHERE type = 'goal_reached' AND (data->>'goalId') = $1`,
      [goal.body.id],
    );
    expect(rows.rows).toHaveLength(1);

    await authed(app, "delete", `/households/${householdId}/goals/${goal.body.id}`, owner.accessToken).expect(
      204,
    );
  });

  it("orçamento estourado dispara budget_exceeded 1x/mês (dedup por budget×mês)", async () => {
    const budget = await authed(app, "post", `/households/${householdId}/budgets`, owner.accessToken)
      .send({ categoryId, amountCents: 10000 })
      .expect(201);

    // Estoura o limite — deve gravar 1 notificação + 1 linha de dedup.
    await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({
        type: "expense",
        amountCents: 15000,
        description: "Estourou",
        date: isoDate(current, 10),
        categoryId,
      })
      .expect(201);

    const rows = await pool.query(
      `SELECT id FROM public.notifications WHERE type = 'budget_exceeded' AND (data->>'budgetId') = $1`,
      [budget.body.id],
    );
    expect(rows.rows).toHaveLength(1);

    const dedupRows = await pool.query(
      `SELECT id FROM public.notification_dedup WHERE event_type = 'budget_exceeded' AND context_id = $1`,
      [budget.body.id],
    );
    expect(dedupRows.rows).toHaveLength(1);

    // Uma 2ª despesa no MESMO mês, ainda estourada, não re-dispara.
    await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({
        type: "expense",
        amountCents: 5000,
        description: "Continua estourado",
        date: isoDate(current, 20),
        categoryId,
      })
      .expect(201);

    const rowsAfter = await pool.query(
      `SELECT id FROM public.notifications WHERE type = 'budget_exceeded' AND (data->>'budgetId') = $1`,
      [budget.body.id],
    );
    expect(rowsAfter.rows).toHaveLength(1);

    await authed(app, "delete", `/households/${householdId}/budgets/${budget.body.id}`, owner.accessToken).expect(
      204,
    );
  });
});
