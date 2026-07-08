import { INestApplication } from "@nestjs/common";
import { Pool } from "pg";
import { adminPool, authed, cleanupByEmailPattern, createTestApp, signUpUser, TestUser } from "./helpers";

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

describe("Reports (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let owner: TestUser;
  let householdId: string;
  let foodCategoryId: string;
  let transportCategoryId: string;
  let internalUserId: string;

  const now = new Date();
  const refYear = now.getFullYear();
  const refMonth = now.getMonth() + 1;
  const firstBucket = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const secondBucket = new Date(now.getFullYear(), now.getMonth() - 4, 1);

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
    owner = await signUpUser(app, "rep.owner");

    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Relatorios" })
      .expect(201);
    householdId = created.body.id;

    const internalUser = await pool.query<{ id: string }>(
      `SELECT id FROM public.users WHERE email = $1`,
      [owner.email],
    );
    internalUserId = internalUser.rows[0]!.id;

    const categories = await authed(
      app,
      "get",
      `/households/${householdId}/categories`,
      owner.accessToken,
    ).expect(200);
    foodCategoryId = categories.body.find((c: { name: string }) => c.name === "Alimentação").id;
    transportCategoryId = categories.body.find((c: { name: string }) => c.name === "Transporte").id;

    // Primeiro bucket da série de 6 meses.
    await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({
        type: "expense",
        amountCents: 10000,
        description: "Primeiro bucket despesa",
        date: isoDate(firstBucket.getFullYear(), firstBucket.getMonth() + 1, 15),
        categoryId: foodCategoryId,
      })
      .expect(201);

    // Segundo bucket: receita.
    await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({
        type: "income",
        amountCents: 50000,
        description: "Segundo bucket receita",
        date: isoDate(secondBucket.getFullYear(), secondBucket.getMonth() + 1, 10),
      })
      .expect(201);

    // Mês corrente — breakdown por categoria e pessoa.
    await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({
        type: "expense",
        amountCents: 15000,
        description: "Mês corrente alimentação",
        date: isoDate(refYear, refMonth, 12),
        categoryId: foodCategoryId,
        personId: internalUserId,
      })
      .expect(201);
    await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({
        type: "expense",
        amountCents: 8000,
        description: "Mês corrente transporte",
        date: isoDate(refYear, refMonth, 20),
        categoryId: transportCategoryId,
        personId: internalUserId,
      })
      .expect(201);

    // Despesa sem pessoa atribuída no mês corrente.
    await pool.query(
      `INSERT INTO public.transactions
        (household_id, created_by, person_id, category_id, type, amount_cents, description, date)
       VALUES ($1, $2, NULL, $3, 'expense', 5000, 'Sem pessoa', $4)`,
      [householdId, internalUserId, foodCategoryId, isoDate(refYear, refMonth, 25)],
    );
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  it("GET /monthly retorna 6 buckets, breakdown por categoria e por pessoa", async () => {
    const res = await authed(
      app,
      "get",
      `/households/${householdId}/reports/monthly`,
      owner.accessToken,
    ).expect(200);

    expect(res.body.months).toHaveLength(6);
    expect(res.body.refMonth).toEqual({ month: refMonth, year: refYear });

    const first = res.body.months.find(
      (m: { month: number; year: number }) =>
        m.month === firstBucket.getMonth() + 1 && m.year === firstBucket.getFullYear(),
    );
    expect(first.expenseCents).toBe(10000);
    expect(first.incomeCents).toBe(0);

    const second = res.body.months.find(
      (m: { month: number; year: number }) =>
        m.month === secondBucket.getMonth() + 1 && m.year === secondBucket.getFullYear(),
    );
    expect(second.incomeCents).toBe(50000);

    const current = res.body.months.find(
      (m: { month: number; year: number }) => m.month === refMonth && m.year === refYear,
    );
    expect(current.expenseCents).toBe(28000); // 15000 + 8000 + 5000

    const categoryTotal = res.body.byCategory.reduce(
      (sum: number, c: { amountCents: number }) => sum + c.amountCents,
      0,
    );
    expect(categoryTotal).toBe(28000);

    const food = res.body.byCategory.find((c: { name: string }) => c.name === "Alimentação");
    expect(food.amountCents).toBe(20000);

    const semPessoa = res.body.byPerson.find((p: { name: string }) => p.name === "Sem pessoa");
    expect(semPessoa).toBeDefined();
    expect(semPessoa.amountCents).toBe(5000);

    const comPessoa = res.body.byPerson.find((p: { userId: string }) => p.userId === internalUserId);
    expect(comPessoa.amountCents).toBe(23000);
  });

  it("GET /annual retorna 12 buckets e totais do ano", async () => {
    const res = await authed(
      app,
      "get",
      `/households/${householdId}/reports/annual?year=${refYear}`,
      owner.accessToken,
    ).expect(200);

    expect(res.body.year).toBe(refYear);
    expect(res.body.months).toHaveLength(12);

    const first = res.body.months.find(
      (m: { month: number }) => m.month === firstBucket.getMonth() + 1,
    );
    expect(first.expenseCents).toBe(10000);

    expect(res.body.totals.incomeCents).toBe(50000);
    expect(res.body.totals.expenseCents).toBe(38000); // 10000 + 28000
    expect(res.body.totals.balanceCents).toBe(12000);
  });

  it("não-membro recebe 403", async () => {
    const stranger = await signUpUser(app, "rep.stranger");
    await authed(
      app,
      "get",
      `/households/${householdId}/reports/monthly`,
      stranger.accessToken,
    ).expect(403);
  });
});
