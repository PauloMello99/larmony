import { INestApplication } from "@nestjs/common";
import { Pool } from "pg";
import {
  activateHousehold,
  adminPool,
  authed,
  cleanupByEmailPattern,
  createTestApp,
  signUpUser,
  TestUser,
} from "./helpers";

/** Mês/ano (1-12/YYYY) do mês corrente do processo de teste — mesma âncora do backend. */
function currentPeriod(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function shiftPeriod(period: { month: number; year: number }, delta: number) {
  const total = period.year * 12 + (period.month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

function isoDate(period: { month: number; year: number }, day = 15): string {
  return `${period.year}-${String(period.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

describe("Budgets (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let owner: TestUser;
  let householdId: string;
  let categoryId: string;

  const current = currentPeriod();
  const previous = shiftPeriod(current, -1);
  const next = shiftPeriod(current, 1);

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
    owner = await signUpUser(app, "bud.owner");

    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Orcamentos" })
      .expect(201);
    householdId = created.body.id;
    // M16: orçamentos são Completo — ativa o lar como Completo (comp) para o CRUD.
    await activateHousehold(pool, householdId, "completo");

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

  async function listPeriod(period: { month: number; year: number }) {
    return authed(
      app,
      "get",
      `/households/${householdId}/budgets?month=${period.month}&year=${period.year}`,
      owner.accessToken,
    ).expect(200);
  }

  it("cria uma série ancorada no mês corrente (série não expõe amountCents — resolvido no GET)", async () => {
    const created = await authed(app, "post", `/households/${householdId}/budgets`, owner.accessToken)
      .send({ categoryId, amountCents: 50000 })
      .expect(201);

    expect(created.body.categoryId).toBe(categoryId);
    expect(created.body.endedFrom).toBeNull();

    const list = await listPeriod(current);
    const budget = list.body.find((b: { id: string }) => b.id === created.body.id);
    expect(budget).toBeDefined();
    expect(budget.categoryName).toBe("Alimentação");
    expect(budget.limitCents).toBe(50000);
    expect(budget.spentCents).toBe(0);
    expect(budget.isEditable).toBe(true);
    expect(budget.isProjected).toBe(false);
  });

  it("herda o limite para o mês seguinte como projeção (isEditable=false, isProjected=true)", async () => {
    const list = await listPeriod(next);
    const budget = list.body.find((b: { categoryId: string }) => b.categoryId === categoryId);

    expect(budget).toBeDefined();
    expect(budget.limitCents).toBe(50000);
    expect(budget.isEditable).toBe(false);
    expect(budget.isProjected).toBe(true);
  });

  it("não aparece em um mês anterior à primeira versão (isEditable=false, isProjected=false)", async () => {
    const list = await listPeriod(previous);
    const budget = list.body.find((b: { categoryId: string }) => b.categoryId === categoryId);

    expect(budget).toBeUndefined();
  });

  it("spending reflete transações de despesa da categoria no mês corrente", async () => {
    await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({ type: "expense", amountCents: 12000, description: "Mercado 1", date: isoDate(current, 5), categoryId })
      .expect(201);
    await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({ type: "expense", amountCents: 8000, description: "Mercado 2", date: isoDate(current, 20), categoryId })
      .expect(201);
    // Uma receita na mesma categoria NÃO deve contar como gasto.
    await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({ type: "income", amountCents: 99999, description: "Estorno", date: isoDate(current, 10), categoryId })
      .expect(201);
    // Uma despesa fora do período (mês seguinte) NÃO deve contar.
    await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({ type: "expense", amountCents: 5000, description: "Fora do mês", date: isoDate(next, 1), categoryId })
      .expect(201);

    const list = await listPeriod(current);
    const budget = list.body.find((b: { categoryId: string }) => b.categoryId === categoryId);
    expect(budget.spentCents).toBe(20000); // 12000 + 8000 apenas
  });

  it("duplicata (série já aberta para a categoria) retorna 409", async () => {
    await authed(app, "post", `/households/${householdId}/budgets`, owner.accessToken)
      .send({ categoryId, amountCents: 30000 })
      .expect(409);
  });

  it("edita o limite no mês corrente — upsert da mesma versão, não cria duas", async () => {
    const list = await listPeriod(current);
    const budget = list.body.find((b: { categoryId: string }) => b.categoryId === categoryId);

    await authed(app, "patch", `/households/${householdId}/budgets/${budget.id}`, owner.accessToken)
      .send({ amountCents: 60000 })
      .expect(200);
    // Reeditar no mesmo mês de novo — mesma versão, não duplica.
    await authed(app, "patch", `/households/${householdId}/budgets/${budget.id}`, owner.accessToken)
      .send({ amountCents: 75000 })
      .expect(200);

    const { rows } = await pool.query(
      `SELECT amount_cents::int, effective_from::text FROM public.budget_versions WHERE budget_id = $1`,
      [budget.id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].amount_cents).toBe(75000);

    const updatedList = await listPeriod(current);
    const updated = updatedList.body.find((b: { id: string }) => b.id === budget.id);
    expect(updated.limitCents).toBe(75000);
  });

  it("mês passado permanece imutável mesmo após editar o mês corrente (seed direto de uma versão anterior)", async () => {
    const list = await listPeriod(current);
    const budget = list.body.find((b: { categoryId: string }) => b.categoryId === categoryId);

    // Seed direto (o API nunca cria versão passada) simulando que a série já
    // existia com outro valor antes do mês corrente.
    await pool.query(
      `INSERT INTO public.budget_versions (budget_id, amount_cents, effective_from) VALUES ($1, $2, $3)`,
      [budget.id, 40000, isoDate(previous, 1)],
    );

    const editedAgain = await authed(
      app,
      "patch",
      `/households/${householdId}/budgets/${budget.id}`,
      owner.accessToken,
    )
      .send({ amountCents: 90000 })
      .expect(200);
    expect(editedAgain.body.id).toBe(budget.id);

    const pastList = await listPeriod(previous);
    const past = pastList.body.find((b: { id: string }) => b.id === budget.id);
    expect(past.limitCents).toBe(40000); // NÃO virou 90000 — imutável.

    const currentList = await listPeriod(current);
    const curr = currentList.body.find((b: { id: string }) => b.id === budget.id);
    expect(curr.limitCents).toBe(90000);
  });

  it("editar uma série encerrada retorna 422", async () => {
    const list = await listPeriod(current);
    const budget = list.body.find((b: { categoryId: string }) => b.categoryId === categoryId);

    await authed(app, "delete", `/households/${householdId}/budgets/${budget.id}`, owner.accessToken).expect(
      204,
    );

    await authed(app, "patch", `/households/${householdId}/budgets/${budget.id}`, owner.accessToken)
      .send({ amountCents: 10000 })
      .expect(422);
  });

  it("remover encerra a série: mês passado preserva histórico, mês corrente some, recriar não dá 409", async () => {
    const list = await listPeriod(previous);
    const past = list.body.find((b: { categoryId: string }) => b.categoryId === categoryId);
    expect(past).toBeDefined();
    expect(past.limitCents).toBe(40000); // histórico intacto (série encerrada no teste anterior).

    const currentList = await listPeriod(current);
    expect(
      currentList.body.find((b: { categoryId: string }) => b.categoryId === categoryId),
    ).toBeUndefined();

    // Recriar para a mesma categoria funciona — a série antiga está encerrada.
    const recreated = await authed(app, "post", `/households/${householdId}/budgets`, owner.accessToken)
      .send({ categoryId, amountCents: 20000 })
      .expect(201);
    expect(recreated.body.endedFrom).toBeNull();
  });

  it("remover uma série já encerrada retorna 404 (idempotente)", async () => {
    const list = await listPeriod(current);
    const budget = list.body.find((b: { categoryId: string }) => b.categoryId === categoryId);

    await authed(app, "delete", `/households/${householdId}/budgets/${budget.id}`, owner.accessToken).expect(
      204,
    );
    await authed(app, "delete", `/households/${householdId}/budgets/${budget.id}`, owner.accessToken).expect(
      404,
    );
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

  it("M16: orçamentos são Completo-only — Essencial recebe 402 PREMIUM_REQUIRED (até no GET); Completo cria ilimitado", async () => {
    // Lar Essencial isolado: não tem a capability `budgets`.
    const solo = await signUpUser(app, "bud.tier.owner");
    const solo1 = await authed(app, "post", "/households", solo.accessToken)
      .send({ name: "E2E Lar Tier Orcamentos" })
      .expect(201);
    const soloHouseholdId = solo1.body.id;
    await activateHousehold(pool, soloHouseholdId, "essencial");

    const cats = await authed(
      app,
      "get",
      `/households/${soloHouseholdId}/categories`,
      solo.accessToken,
    ).expect(200);
    const c1 = cats.body.find((c: { name: string }) => c.name === "Alimentação").id;

    // Essencial não enxerga orçamentos — a rota inteira é gateada (inclusive GET).
    const blockedGet = await authed(
      app,
      "get",
      `/households/${soloHouseholdId}/budgets`,
      solo.accessToken,
    ).expect(402);
    expect(blockedGet.body.code).toBe("PREMIUM_REQUIRED");

    const blocked = await authed(app, "post", `/households/${soloHouseholdId}/budgets`, solo.accessToken)
      .send({ categoryId: c1, amountCents: 50000 })
      .expect(402);
    expect(blocked.body.code).toBe("PREMIUM_REQUIRED");

    // Vira Completo → cria à vontade (sem régua de contagem).
    await activateHousehold(pool, soloHouseholdId, "completo");
    for (const name of ["Alimentação", "Moradia", "Transporte", "Saúde"]) {
      const categoryId = cats.body.find((c: { name: string }) => c.name === name).id;
      await authed(app, "post", `/households/${soloHouseholdId}/budgets`, solo.accessToken)
        .send({ categoryId, amountCents: 50000 })
        .expect(201);
    }
  });
});
