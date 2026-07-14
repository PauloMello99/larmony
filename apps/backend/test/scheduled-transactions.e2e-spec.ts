import { INestApplication } from "@nestjs/common";
import request from "supertest";
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

/**
 * ISO (yyyy-MM-dd) deslocado `days` a partir de hoje, em data LOCAL — espelha
 * o `toISODate` do backend (`common/finance/due-date.ts`). Usar `toISOString()`
 * (UTC) aqui causava flake de fuso na borda de meia-noite: p.ex. às 21h em
 * UTC-3, `isoDaysFromNow(-1)` em UTC devolvia "hoje local", e o teste de
 * "startDate no passado" falhava porque a validação (local) não o rejeitava.
 */
function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Lançamentos programados (ADR-0020 — unifica bills + recurrences): CRUD +
 * launch manual + engine/lembrete no tick do cron. O eixo que separa os dois
 * modos é `postingMode`: `auto` (engine gera a transação, cursor `nextRunDate`)
 * vs `manual` (lembrete + launch explícito, sem cursor — próxima ocorrência
 * calculada estatelessmente a partir de `startDate`).
 */
describe("ScheduledTransactions (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let owner: TestUser;
  let householdId: string;
  let categoryId: string;
  const secret = process.env["CRON_SECRET"] ?? "";

  function tick() {
    return request(app.getHttpServer()).post("/internal/cron/tick").set("x-cron-secret", secret);
  }

  /** Cursor/fim de uma entrada auto direto no banco (admin) — simula ticks perdidos. */
  async function setSchedule(id: string, nextRunDate: string, endDate?: string) {
    await pool.query(
      `UPDATE public.scheduled_transaction_entries SET next_run_date = $2, end_date = $3 WHERE id = $1`,
      [id, nextRunDate, endDate ?? null],
    );
  }

  async function generatedFor(entryId: string) {
    const res = await pool.query(
      `SELECT count(*)::int AS n FROM public.transactions WHERE scheduled_transaction_entry_id = $1`,
      [entryId],
    );
    return res.rows[0].n as number;
  }

  async function entryRow(id: string) {
    // next_run_date::text → string ISO (o driver pg devolve DATE como Date).
    const res = await pool.query(
      `SELECT is_active, next_run_date::text AS next_run_date, reminder_last_sent_at
       FROM public.scheduled_transaction_entries WHERE id = $1`,
      [id],
    );
    return res.rows[0] as {
      is_active: boolean;
      next_run_date: string | null;
      reminder_last_sent_at: Date | null;
    };
  }

  async function createEntry(body: Record<string, unknown>) {
    const res = await authed(
      app,
      "post",
      `/households/${householdId}/scheduled-transactions`,
      owner.accessToken,
    )
      .send(body)
      .expect(201);
    return res.body as { id: string };
  }

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
    owner = await signUpUser(app, "sched.owner");

    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Lancamentos" })
      .expect(201);
    householdId = created.body.id;
    // M16: lançamentos programados são Completo — ativa o lar como Completo.
    await activateHousehold(pool, householdId, "completo");

    // M12: o job de lembrete só dispara a partir de households.notification_hour
    // no fuso do lar. Fixamos UTC + hora 0 para o gate ficar sempre aberto e o
    // "hoje" ser determinístico (senão o tick real dependeria da hora do CI).
    await pool.query(
      `UPDATE public.households SET timezone = 'UTC', notification_hour = 0 WHERE id = $1`,
      [householdId],
    );

    const categories = await authed(
      app,
      "get",
      `/households/${householdId}/categories`,
      owner.accessToken,
    ).expect(200);
    categoryId = categories.body.find((c: { name: string }) => c.name === "Moradia").id;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  // ─── CRUD ───

  it("cria uma entrada manual e lista com próxima ocorrência calculada", async () => {
    const created = await createEntry({
      postingMode: "manual",
      type: "expense",
      amountCents: 250000,
      description: "Aluguel",
      frequency: "monthly",
      interval: 1,
      startDate: isoDaysFromNow(-30),
      categoryId,
      reminderDaysBefore: 3,
    });

    const list = await authed(
      app,
      "get",
      `/households/${householdId}/scheduled-transactions`,
      owner.accessToken,
    ).expect(200);
    const entry = list.body.find((e: { id: string }) => e.id === created.id);
    expect(entry).toBeDefined();
    expect(entry.postingMode).toBe("manual");
    expect(entry.categoryName).toBe("Moradia");
    expect(entry.nextRunDate).toBeNull();
    expect(typeof entry.daysUntilDue).toBe("number");
    expect(entry.dueDate).toBeTruthy();
  });

  it("cria uma entrada auto (receita) com cursor = startDate", async () => {
    const created = await createEntry({
      postingMode: "auto",
      type: "income",
      amountCents: 500000,
      description: "Salário",
      frequency: "monthly",
      startDate: isoDaysFromNow(0),
      categoryId,
    });

    const list = await authed(
      app,
      "get",
      `/households/${householdId}/scheduled-transactions`,
      owner.accessToken,
    ).expect(200);
    const entry = list.body.find((e: { id: string }) => e.id === created.id);
    expect(entry.postingMode).toBe("auto");
    expect(entry.type).toBe("income");
    expect(entry.nextRunDate).toBe(isoDaysFromNow(0));
    expect(entry.reminderDaysBefore).toBeNull();
  });

  it("rejeita startDate no passado no modo auto (422)", async () => {
    await authed(app, "post", `/households/${householdId}/scheduled-transactions`, owner.accessToken)
      .send({
        postingMode: "auto",
        type: "income",
        amountCents: 100000,
        description: "Salário retroativo",
        frequency: "monthly",
        startDate: isoDaysFromNow(-1),
      })
      .expect(422);
  });

  it("aceita startDate no passado no modo manual (conta antiga)", async () => {
    const created = await createEntry({
      postingMode: "manual",
      type: "expense",
      amountCents: 5000,
      description: "Conta antiga",
      frequency: "monthly",
      startDate: isoDaysFromNow(-400),
    });
    expect(created.id).toBeDefined();
  });

  it("rejeita endDate anterior ao startDate (422)", async () => {
    await authed(app, "post", `/households/${householdId}/scheduled-transactions`, owner.accessToken)
      .send({
        postingMode: "auto",
        type: "expense",
        amountCents: 5000,
        description: "Janela inválida",
        frequency: "monthly",
        startDate: isoDaysFromNow(10),
        endDate: isoDaysFromNow(5),
      })
      .expect(422);
  });

  it("edita a entrada (valor + desativar via toggle)", async () => {
    const created = await createEntry({
      postingMode: "manual",
      type: "expense",
      amountCents: 3000,
      description: "Academia",
      frequency: "monthly",
      startDate: isoDaysFromNow(0),
    });

    const updated = await authed(
      app,
      "patch",
      `/households/${householdId}/scheduled-transactions/${created.id}`,
      owner.accessToken,
    )
      .send({ amountCents: 3500, isActive: false })
      .expect(200);

    expect(updated.body.amountCents).toBe(3500);
    expect(updated.body.isActive).toBe(false);
  });

  it("toggle manual→auto re-ancora o cursor na próxima ocorrência >= hoje", async () => {
    const created = await createEntry({
      postingMode: "manual",
      type: "expense",
      amountCents: 1000,
      description: "Streaming",
      frequency: "monthly",
      startDate: isoDaysFromNow(-90),
    });

    const updated = await authed(
      app,
      "patch",
      `/households/${householdId}/scheduled-transactions/${created.id}`,
      owner.accessToken,
    )
      .send({ postingMode: "auto" })
      .expect(200);

    expect(updated.body.postingMode).toBe("auto");
    expect(updated.body.nextRunDate).toBeTruthy();
    expect(updated.body.nextRunDate >= isoDaysFromNow(0)).toBe(true);
  });

  it("toggle auto→manual limpa o cursor", async () => {
    const created = await createEntry({
      postingMode: "auto",
      type: "expense",
      amountCents: 1000,
      description: "Assinatura",
      frequency: "monthly",
      startDate: isoDaysFromNow(0),
    });

    const updated = await authed(
      app,
      "patch",
      `/households/${householdId}/scheduled-transactions/${created.id}`,
      owner.accessToken,
    )
      .send({ postingMode: "manual" })
      .expect(200);

    expect(updated.body.postingMode).toBe("manual");
    expect(updated.body.nextRunDate).toBeNull();
  });

  it("deleta uma entrada", async () => {
    const created = await createEntry({
      postingMode: "manual",
      type: "expense",
      amountCents: 1000,
      description: "Descartável",
      frequency: "weekly",
      startDate: isoDaysFromNow(0),
    });

    await authed(
      app,
      "delete",
      `/households/${householdId}/scheduled-transactions/${created.id}`,
      owner.accessToken,
    ).expect(204);

    const list = await authed(
      app,
      "get",
      `/households/${householdId}/scheduled-transactions`,
      owner.accessToken,
    ).expect(200);
    expect(list.body.find((e: { id: string }) => e.id === created.id)).toBeUndefined();
  });

  it("não-membro recebe 403", async () => {
    const stranger = await signUpUser(app, "sched.stranger");
    await authed(
      app,
      "get",
      `/households/${householdId}/scheduled-transactions`,
      stranger.accessToken,
    ).expect(403);
  });

  // ─── Launch (modo manual) ───

  it("lança uma entrada manual como transação — a entrada continua existindo", async () => {
    const entry = await createEntry({
      postingMode: "manual",
      type: "expense",
      amountCents: 9900,
      description: "Academia",
      frequency: "monthly",
      startDate: isoDaysFromNow(0),
      categoryId,
    });

    const launched = await authed(
      app,
      "post",
      `/households/${householdId}/scheduled-transactions/${entry.id}/launch`,
      owner.accessToken,
    ).expect(201);

    expect(launched.body.type).toBe("expense");
    expect(launched.body.amountCents).toBe(9900);
    expect(launched.body.description).toBe("Academia");
    expect(launched.body.categoryId).toBe(categoryId);

    const transactions = await authed(
      app,
      "get",
      `/households/${householdId}/transactions`,
      owner.accessToken,
    ).expect(200);
    expect(transactions.body.items.some((t: { id: string }) => t.id === launched.body.id)).toBe(true);

    // A entrada continua existindo (não some, não é consumida) e é relançável.
    const list = await authed(
      app,
      "get",
      `/households/${householdId}/scheduled-transactions`,
      owner.accessToken,
    ).expect(200);
    expect(list.body.some((e: { id: string }) => e.id === entry.id)).toBe(true);
  });

  it("lança uma entrada manual de RECEITA — type vem da entrada, não hardcoded", async () => {
    const entry = await createEntry({
      postingMode: "manual",
      type: "income",
      amountCents: 20000,
      description: "Reembolso",
      frequency: "monthly",
      startDate: isoDaysFromNow(0),
    });

    const launched = await authed(
      app,
      "post",
      `/households/${householdId}/scheduled-transactions/${entry.id}/launch`,
      owner.accessToken,
    ).expect(201);

    expect(launched.body.type).toBe("income");
    expect(launched.body.amountCents).toBe(20000);
  });

  it("bloqueia launch de uma entrada auto (409) — engine já posta sozinho", async () => {
    const entry = await createEntry({
      postingMode: "auto",
      type: "expense",
      amountCents: 1000,
      description: "Assinatura auto",
      frequency: "monthly",
      startDate: isoDaysFromNow(0),
    });

    await authed(
      app,
      "post",
      `/households/${householdId}/scheduled-transactions/${entry.id}/launch`,
      owner.accessToken,
    ).expect(409);
  });

  // ─── Engine (modo auto) ───

  it("tick lista os jobs scheduled-transactions-engine e -reminders com status ok", async () => {
    const res = await tick().expect(200);
    expect(res.body.ok).toBe(true);
    const names = res.body.jobs.map((j: { name: string }) => j.name);
    expect(names).toContain("scheduled-transactions-engine");
    expect(names).toContain("scheduled-transactions-reminders");
    for (const job of res.body.jobs) expect(job.status).toBe("ok");
  });

  it("gera a transação da ocorrência vencida e NÃO duplica no tick seguinte", async () => {
    const entry = await createEntry({
      postingMode: "auto",
      type: "income",
      amountCents: 500000,
      description: "Salário mensal",
      frequency: "monthly",
      startDate: isoDaysFromNow(0),
      categoryId,
    });
    // Simula ocorrência vencida (cursor 3 dias atrás).
    await setSchedule(entry.id, isoDaysFromNow(-3));

    await tick().expect(200);
    expect(await generatedFor(entry.id)).toBe(1);

    // Cursor avançou 1 mês → agora no futuro (não vence de novo hoje).
    const after = await entryRow(entry.id);
    expect(after.next_run_date! > isoDaysFromNow(0)).toBe(true);

    // A transação gerada carrega o scheduledTransactionEntryId e aparece na listagem.
    const list = await authed(
      app,
      "get",
      `/households/${householdId}/transactions?limit=100&offset=0`,
      owner.accessToken,
    ).expect(200);
    const generated = list.body.items.find(
      (t: { scheduledTransactionEntryId: string | null }) => t.scheduledTransactionEntryId === entry.id,
    );
    expect(generated).toBeDefined();
    expect(generated.type).toBe("income");
    expect(generated.amountCents).toBe(500000);

    // Tick repetido → nenhuma nova transação.
    await tick().expect(200);
    expect(await generatedFor(entry.id)).toBe(1);
  });

  it("faz catch-up de múltiplas ocorrências perdidas num único tick", async () => {
    const entry = await createEntry({
      postingMode: "auto",
      type: "expense",
      amountCents: 2000,
      description: "Mesada semanal",
      frequency: "weekly",
      startDate: isoDaysFromNow(0),
    });
    // 20 dias atrás, semanal → ocorrências em -20, -13, -6 (o +1 é futuro).
    await setSchedule(entry.id, isoDaysFromNow(-20));

    await tick().expect(200);
    expect(await generatedFor(entry.id)).toBe(3);
    expect((await entryRow(entry.id)).next_run_date! > isoDaysFromNow(0)).toBe(true);
  });

  it("encerra a série (isActive=false) ao ultrapassar o endDate, sem gerar", async () => {
    const entry = await createEntry({
      postingMode: "auto",
      type: "expense",
      amountCents: 1500,
      description: "Promoção temporária",
      frequency: "monthly",
      startDate: isoDaysFromNow(0),
    });
    // Cursor vencido mas depois do fim da série → encerra sem gerar.
    await setSchedule(entry.id, isoDaysFromNow(-1), isoDaysFromNow(-5));

    await tick().expect(200);
    expect(await generatedFor(entry.id)).toBe(0);
    expect((await entryRow(entry.id)).is_active).toBe(false);
  });

  // ─── Lembrete (modo manual) ───

  it("dispara o lembrete na janela exata e marca reminderLastSentAt (dedup por dia)", async () => {
    // Dia-de-origem = dia-do-mês de "hoje + 3 dias", ancorado em janeiro/2020
    // (sempre tem 31 dias, evita clamp) — a próxima ocorrência mensal cai
    // exatamente em "hoje + 3 dias", então o lembrete (reminderDaysBefore=3)
    // dispara neste tick.
    const target = new Date();
    target.setDate(target.getDate() + 3);
    const startDate = `2020-01-${String(target.getDate()).padStart(2, "0")}`;

    const entry = await createEntry({
      postingMode: "manual",
      type: "expense",
      amountCents: 15000,
      description: "Conta com lembrete",
      frequency: "monthly",
      startDate,
      reminderDaysBefore: 3,
    });

    await tick().expect(200);

    const after = await entryRow(entry.id);
    expect(after.reminder_last_sent_at).not.toBeNull();

    // Tick repetido no mesmo dia → dedup (não re-marca com timestamp diferente).
    const sentAt = after.reminder_last_sent_at;
    await tick().expect(200);
    expect((await entryRow(entry.id)).reminder_last_sent_at).toEqual(sentAt);
  });
});
