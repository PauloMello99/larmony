import { INestApplication } from "@nestjs/common";
import { Pool } from "pg";
import { adminPool, authed, cleanupByEmailPattern, createTestApp, signUpUser, TestUser } from "./helpers";

describe("Budgets (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let owner: TestUser;
  let householdId: string;
  let categoryId: string;

  const MONTH = 6;
  const YEAR = 2026;

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
    owner = await signUpUser(app, "bud.owner");

    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Orcamentos" })
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

  it("cria um orçamento e lista com spending derivado zero", async () => {
    const created = await authed(app, "post", `/households/${householdId}/budgets`, owner.accessToken)
      .send({ categoryId, month: MONTH, year: YEAR, amountCents: 50000 })
      .expect(201);

    expect(created.body.amountCents).toBe(50000);

    const list = await authed(
      app,
      "get",
      `/households/${householdId}/budgets?month=${MONTH}&year=${YEAR}`,
      owner.accessToken,
    ).expect(200);

    const budget = list.body.find((b: { id: string }) => b.id === created.body.id);
    expect(budget).toBeDefined();
    expect(budget.categoryName).toBe("Alimentação");
    expect(budget.limitCents).toBe(50000);
    expect(budget.spentCents).toBe(0);
  });

  it("spending reflete transações de despesa da categoria no período", async () => {
    // Lança duas despesas na categoria dentro do período do orçamento.
    await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({ type: "expense", amountCents: 12000, description: "Mercado 1", date: `${YEAR}-0${MONTH}-05`, categoryId })
      .expect(201);
    await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({ type: "expense", amountCents: 8000, description: "Mercado 2", date: `${YEAR}-0${MONTH}-20`, categoryId })
      .expect(201);
    // Uma receita na mesma categoria NÃO deve contar como gasto.
    await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({ type: "income", amountCents: 99999, description: "Estorno", date: `${YEAR}-0${MONTH}-10`, categoryId })
      .expect(201);
    // Uma despesa fora do período (mês seguinte) NÃO deve contar.
    await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({ type: "expense", amountCents: 5000, description: "Fora do mês", date: `${YEAR}-07-01`, categoryId })
      .expect(201);

    const list = await authed(
      app,
      "get",
      `/households/${householdId}/budgets?month=${MONTH}&year=${YEAR}`,
      owner.accessToken,
    ).expect(200);

    const budget = list.body.find((b: { categoryId: string }) => b.categoryId === categoryId);
    expect(budget.spentCents).toBe(20000); // 12000 + 8000 apenas
  });

  it("duplicata (mesma categoria+período) retorna 409", async () => {
    await authed(app, "post", `/households/${householdId}/budgets`, owner.accessToken)
      .send({ categoryId, month: MONTH, year: YEAR, amountCents: 30000 })
      .expect(409);
  });

  it("edita o limite de um orçamento", async () => {
    const list = await authed(
      app,
      "get",
      `/households/${householdId}/budgets?month=${MONTH}&year=${YEAR}`,
      owner.accessToken,
    ).expect(200);
    const budget = list.body.find((b: { categoryId: string }) => b.categoryId === categoryId);

    const updated = await authed(
      app,
      "patch",
      `/households/${householdId}/budgets/${budget.id}`,
      owner.accessToken,
    )
      .send({ amountCents: 75000 })
      .expect(200);
    expect(updated.body.amountCents).toBe(75000);
  });

  it("deleta um orçamento", async () => {
    const list = await authed(
      app,
      "get",
      `/households/${householdId}/budgets?month=${MONTH}&year=${YEAR}`,
      owner.accessToken,
    ).expect(200);
    const budget = list.body.find((b: { categoryId: string }) => b.categoryId === categoryId);

    await authed(
      app,
      "delete",
      `/households/${householdId}/budgets/${budget.id}`,
      owner.accessToken,
    ).expect(204);

    const after = await authed(
      app,
      "get",
      `/households/${householdId}/budgets?month=${MONTH}&year=${YEAR}`,
      owner.accessToken,
    ).expect(200);
    expect(after.body.find((b: { id: string }) => b.id === budget.id)).toBeUndefined();
  });

  it("não-membro recebe 403", async () => {
    const stranger = await signUpUser(app, "bud.stranger");
    await authed(
      app,
      "get",
      `/households/${householdId}/budgets`,
      stranger.accessToken,
    ).expect(403);
  });
});
