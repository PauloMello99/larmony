import "dotenv/config";
import { Pool } from "pg";
import { toISODate, lastDayOfMonth } from "../src/common/finance/due-date";

/**
 * Seed de dados ricos para dev local — usuário fixo (recriado do zero a cada
 * execução), household com 2 anos de histórico em todas as entidades
 * financeiras. Fala HTTP direto com o dev server do backend (precisa estar
 * rodando — `pnpm --filter backend dev`) + Supabase local up com migrations
 * aplicadas.
 *
 * Nota técnica: roda via HTTP contra o dev server (não em-processo) porque o
 * `tsx`/esbuild não emite corretamente os metadados de decorators
 * (`design:paramtypes`) que o DI do NestJS precisa — injeções implícitas por
 * tipo (ex.: `ConfigService` em `SupabaseAuthProvider`) ficam `undefined` sob
 * esbuild. O dev server real usa o compilador do Nest CLI (tsc), sem esse
 * problema.
 *
 * Uso: pnpm --filter backend seed:local
 */

const EMAIL = "local@user.com";
const PASSWORD = "we3fladmin*";
const HOUSEHOLD_NAME = "Lar Local";
const BASE_URL = `http://localhost:${process.env["PORT"] ?? 3001}`;
/** Espaçamento entre requests — fica com margem sob o rate limit global (120/60s, ThrottlerModule). */
const REQUEST_DELAY_MS = 550;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  const item = items[randomInt(0, items.length - 1)];
  if (item === undefined) throw new Error("pick() chamado com array vazio");
  return item;
}

/** 1º dia do mês a `monthsAgo` meses do mês corrente (negativo = futuro). */
function monthStart(monthsAgo: number, from = new Date()): Date {
  return new Date(from.getFullYear(), from.getMonth() - monthsAgo, 1);
}

function randomDateInMonth(ref: Date): Date {
  const day = randomInt(1, lastDayOfMonth(ref.getFullYear(), ref.getMonth()));
  return new Date(ref.getFullYear(), ref.getMonth(), day);
}

async function ensureServerUp(): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error(`status ${res.status}`);
  } catch {
    throw new Error(
      `Backend não respondeu em ${BASE_URL}/health — rode "pnpm --filter backend dev" antes do seed.`,
    );
  }
}

/** Remove qualquer resquício de execuções anteriores — reseed é sempre do zero. */
async function cleanup(pool: Pool): Promise<void> {
  await pool.query(
    `DELETE FROM public.households WHERE id IN (
       SELECT hm.household_id FROM public.household_memberships hm
       JOIN public.users u ON u.id = hm.user_id WHERE u.email = $1
     )`,
    [EMAIL],
  );
  await pool.query(`DELETE FROM public.users WHERE email = $1`, [EMAIL]);
  await pool.query(`DELETE FROM auth.users WHERE email = $1`, [EMAIL]);
}

interface CategoryDto {
  id: string;
  name: string;
}

async function main(): Promise<void> {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl)
    throw new Error("DATABASE_URL não setada (apps/backend/.env)");
  const pool = new Pool({ connectionString: databaseUrl });

  console.log(`Limpando dados anteriores de ${EMAIL}...`);
  await cleanup(pool);

  await ensureServerUp();

  async function call(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    url: string,
    token: string | undefined,
    body: unknown,
    expectedStatus: number,
  ): Promise<{ status: number; body: unknown }> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const res = await fetch(`${BASE_URL}${url}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const status = res.status;
    const responseBody = status === 204 ? undefined : await res.json();

    if (status !== expectedStatus) {
      throw new Error(
        `${method} ${url} → esperado ${expectedStatus}, recebeu ${status}: ${JSON.stringify(responseBody)}`,
      );
    }
    await sleep(REQUEST_DELAY_MS);
    return { status, body: responseBody };
  }

  console.log("Criando usuário...");
  const signUpRes = await call(
    "POST",
    "/auth/sign-up",
    undefined,
    {
      name: "Usuário Local",
      email: EMAIL,
      password: PASSWORD,
    },
    201,
  );
  const signUpBody = signUpRes.body as {
    accessToken?: string;
    session?: { accessToken?: string };
  };
  const token = signUpBody.accessToken ?? signUpBody.session?.accessToken;
  if (!token) throw new Error("sign-up não retornou accessToken");

  console.log("Criando household...");
  const householdRes = await call(
    "POST",
    "/households",
    token,
    { name: HOUSEHOLD_NAME },
    201,
  );
  const householdId = (householdRes.body as { id: string }).id;

  const categoriesRes = await call(
    "GET",
    `/households/${householdId}/categories`,
    token,
    undefined,
    200,
  );
  const categories = categoriesRes.body as CategoryDto[];
  function catId(name: string): string {
    const category = categories.find((c) => c.name === name);
    if (!category) throw new Error(`Categoria não encontrada: ${name}`);
    return category.id;
  }

  // ─── Transações manuais (24 meses: recorrentes + discricionárias + parcelas) ─
  console.log("Semeando transações dos últimos 24 meses...");

  const DISCRETIONARY: {
    category: string;
    items: string[];
    min: number;
    max: number;
  }[] = [
    {
      category: "Alimentação",
      items: ["Supermercado", "Restaurante", "Padaria", "Delivery"],
      min: 3000,
      max: 45000,
    },
    {
      category: "Transporte",
      items: ["Combustível", "Uber", "Estacionamento", "Manutenção do carro"],
      min: 2000,
      max: 30000,
    },
    {
      category: "Lazer",
      items: ["Cinema", "Streaming extra", "Show", "Passeio"],
      min: 2000,
      max: 25000,
    },
    {
      category: "Saúde",
      items: ["Farmácia", "Consulta médica", "Exame"],
      min: 3000,
      max: 40000,
    },
    {
      category: "Vestuário",
      items: ["Roupas", "Calçados"],
      min: 5000,
      max: 35000,
    },
    {
      category: "Educação",
      items: ["Curso online", "Livros"],
      min: 2000,
      max: 20000,
    },
  ];

  for (let monthsAgo = 23; monthsAgo >= 0; monthsAgo--) {
    const ref = monthStart(monthsAgo);
    const year = ref.getFullYear();
    const monthIndex = ref.getMonth();

    await call(
      "POST",
      `/households/${householdId}/transactions`,
      token,
      {
        type: "income",
        amountCents: randomInt(560000, 640000),
        description: "Salário",
        date: toISODate(new Date(year, monthIndex, 5)),
        categoryId: catId("Salário"),
      },
      201,
    );

    // Aluguel sobe após o 1º ano (inflação/reajuste).
    const aluguelCents = monthsAgo >= 12 ? 150000 : 165000;
    await call(
      "POST",
      `/households/${householdId}/transactions`,
      token,
      {
        type: "expense",
        amountCents: aluguelCents,
        description: "Aluguel",
        date: toISODate(new Date(year, monthIndex, 10)),
        categoryId: catId("Moradia"),
      },
      201,
    );

    await call(
      "POST",
      `/households/${householdId}/transactions`,
      token,
      {
        type: "expense",
        amountCents: 8990,
        description: "Assinatura streaming",
        date: toISODate(new Date(year, monthIndex, 15)),
        categoryId: catId("Assinaturas"),
      },
      201,
    );

    const discretionaryCount = randomInt(4, 7);
    for (let i = 0; i < discretionaryCount; i++) {
      const group = pick(DISCRETIONARY);
      await call(
        "POST",
        `/households/${householdId}/transactions`,
        token,
        {
          type: "expense",
          amountCents: randomInt(group.min, group.max),
          description: pick(group.items),
          date: toISODate(randomDateInMonth(ref)),
          categoryId: catId(group.category),
        },
        201,
      );
    }

    // Compra parcelada a cada 4 meses.
    if (monthsAgo > 0 && monthsAgo % 4 === 0) {
      await call(
        "POST",
        `/households/${householdId}/transactions`,
        token,
        {
          type: "expense",
          amountCents: randomInt(30000, 90000),
          description: pick([
            "Notebook novo",
            "Sofá",
            "Geladeira",
            "Viagem parcelada",
          ]),
          date: toISODate(randomDateInMonth(ref)),
          categoryId: catId(pick(["Vestuário", "Lazer", "Moradia"])),
          installmentCount: randomInt(3, 6),
        },
        201,
      );
    }

    // Renda extra a cada 6 meses.
    if (monthsAgo % 6 === 0) {
      await call(
        "POST",
        `/households/${householdId}/transactions`,
        token,
        {
          type: "income",
          amountCents: randomInt(80000, 300000),
          description: pick(["Freelance", "Bônus", "Venda de usado"]),
          date: toISODate(randomDateInMonth(ref)),
          categoryId: catId(
            pick(["Freelance", "Investimentos", "Outros (entrada)"]),
          ),
        },
        201,
      );
    }

    console.log(`  mês -${monthsAgo}: ok`);
  }

  // ─── Orçamentos (M10 — série + versões; histórico só via SQL direto) ────────
  console.log("Semeando orçamentos com histórico de 2 anos...");

  async function seedContinuousBudget(
    categoryName: string,
    oldCents: number,
    midCents: number,
    currentCents: number,
  ): Promise<void> {
    const created = await call(
      "POST",
      `/households/${householdId}/budgets`,
      token,
      {
        categoryId: catId(categoryName),
        amountCents: currentCents,
      },
      201,
    );
    const budgetId = (created.body as { id: string }).id;
    await pool.query(
      `INSERT INTO public.budget_versions (budget_id, amount_cents, effective_from) VALUES ($1, $2, $3), ($1, $4, $5)`,
      [
        budgetId,
        oldCents,
        toISODate(monthStart(23)),
        midCents,
        toISODate(monthStart(12)),
      ],
    );
  }

  await seedContinuousBudget("Alimentação", 60000, 70000, 85000);
  await seedContinuousBudget("Moradia", 150000, 150000, 165000);
  await seedContinuousBudget("Transporte", 30000, 35000, 40000);
  await seedContinuousBudget("Assinaturas", 8000, 9000, 12000);

  // Lazer: série ANTIGA encerrada há alguns meses + série NOVA reaberta —
  // testa gap (meses sem orçamento) e reabertura após remoção (M10).
  const lazerSeriesA = await call(
    "POST",
    `/households/${householdId}/budgets`,
    token,
    {
      categoryId: catId("Lazer"),
      amountCents: 20000,
    },
    201,
  );
  const lazerSeriesAId = (lazerSeriesA.body as { id: string }).id;
  await pool.query(
    `UPDATE public.budget_versions SET effective_from = $2 WHERE budget_id = $1`,
    [lazerSeriesAId, toISODate(monthStart(23))],
  );
  await pool.query(`UPDATE public.budgets SET ended_from = $2 WHERE id = $1`, [
    lazerSeriesAId,
    toISODate(monthStart(14)),
  ]);

  const lazerSeriesB = await call(
    "POST",
    `/households/${householdId}/budgets`,
    token,
    {
      categoryId: catId("Lazer"),
      amountCents: 25000,
    },
    201,
  );
  const lazerSeriesBId = (lazerSeriesB.body as { id: string }).id;
  await pool.query(
    `INSERT INTO public.budget_versions (budget_id, amount_cents, effective_from) VALUES ($1, $2, $3)`,
    [lazerSeriesBId, 22000, toISODate(monthStart(6))],
  );

  // ─── Metas (goals) ───────────────────────────────────────────────────────────
  console.log("Semeando metas...");

  async function seedGoal(
    name: string,
    targetAmountCents: number,
    targetDateMonthsAgo: number | undefined,
    color: string,
    contributions: { monthsAgo: number; amountCents: number; notes?: string }[],
  ): Promise<void> {
    const body: Record<string, unknown> = { name, targetAmountCents, color };
    if (targetDateMonthsAgo !== undefined) {
      body["targetDate"] = toISODate(monthStart(targetDateMonthsAgo));
    }
    const created = await call(
      "POST",
      `/households/${householdId}/goals`,
      token,
      body,
      201,
    );
    const goalId = (created.body as { id: string }).id;

    for (const c of contributions) {
      await call(
        "POST",
        `/households/${householdId}/goals/${goalId}/contributions`,
        token,
        {
          amountCents: c.amountCents,
          date: toISODate(monthStart(c.monthsAgo)),
          notes: c.notes,
        },
        201,
      );
    }
  }

  await seedGoal("Reserva de emergência", 3000000, undefined, "#22c55e", [
    { monthsAgo: 22, amountCents: 200000 },
    { monthsAgo: 18, amountCents: 250000 },
    { monthsAgo: 14, amountCents: 300000 },
    { monthsAgo: 10, amountCents: 250000 },
    { monthsAgo: 6, amountCents: 300000 },
    { monthsAgo: 2, amountCents: 400000 },
  ]); // ≈ 57% do alvo

  await seedGoal("Viagem para o Japão", 1500000, -10, "#06b6d4", [
    { monthsAgo: 8, amountCents: 100000 },
    { monthsAgo: 5, amountCents: 150000 },
    { monthsAgo: 2, amountCents: 150000 },
  ]); // ≈ 27% do alvo, prazo em 10 meses

  await seedGoal("Troca de celular", 400000, 3, "#8b5cf6", [
    { monthsAgo: 5, amountCents: 200000 },
    { monthsAgo: 3, amountCents: 250000 },
  ]); // 450.000 >= 400.000 → Concluída

  await seedGoal("Pós-graduação", 800000, -14, "#f59e0b", [
    { monthsAgo: 1, amountCents: 50000 },
  ]); // ≈ 6%, começando agora

  // ─── Lançamentos programados (auto + manual) ────────────────────────────────
  console.log("Semeando lançamentos programados...");

  await call(
    "POST",
    `/households/${householdId}/scheduled-transactions`,
    token,
    {
      postingMode: "auto",
      type: "income",
      amountCents: 600000,
      description: "Salário (automático)",
      frequency: "monthly",
      interval: 1,
      startDate: toISODate(new Date()),
      categoryId: catId("Salário"),
    },
    201,
  );

  await call(
    "POST",
    `/households/${householdId}/scheduled-transactions`,
    token,
    {
      postingMode: "auto",
      type: "expense",
      amountCents: 165000,
      description: "Aluguel (automático)",
      frequency: "monthly",
      interval: 1,
      startDate: toISODate(new Date()),
      categoryId: catId("Moradia"),
    },
    201,
  );

  await call(
    "POST",
    `/households/${householdId}/scheduled-transactions`,
    token,
    {
      postingMode: "manual",
      type: "expense",
      amountCents: 45000,
      description: "Plano de saúde",
      frequency: "monthly",
      interval: 1,
      startDate: toISODate(monthStart(2)),
      categoryId: catId("Saúde"),
      reminderDaysBefore: 7,
    },
    201,
  );

  await call(
    "POST",
    `/households/${householdId}/scheduled-transactions`,
    token,
    {
      postingMode: "manual",
      type: "expense",
      amountCents: 120000,
      description: "Seguro do carro (anual)",
      frequency: "yearly",
      interval: 1,
      startDate: toISODate(monthStart(4)),
      categoryId: catId("Transporte"),
      reminderDaysBefore: 15,
    },
    201,
  );

  await pool.end();

  console.log("");
  console.log("Seed concluído.");
  console.log(`  login: ${EMAIL} / ${PASSWORD}`);
  console.log(`  household: ${HOUSEHOLD_NAME} (${householdId})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
