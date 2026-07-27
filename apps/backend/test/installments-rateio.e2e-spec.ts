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

/** M4 — parcelamento (split determinístico) + rateio (igual/específico/combinado). */
describe("Installments + Rateio (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let owner: TestUser;
  let householdId: string;
  let ownerUserId: string;
  let guestUserId: string;

  async function listAll(): Promise<Array<Record<string, unknown>>> {
    const res = await authed(
      app,
      "get",
      `/households/${householdId}/transactions?limit=100`,
      owner.accessToken,
    ).expect(200);
    return res.body.items;
  }

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
    owner = await signUpUser(app, "m4.owner");

    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar M4" })
      .expect(201);
    householdId = created.body.id;
    // M16: ativa a assinatura (Completo) para liberar as escritas financeiras.
    await activateHousehold(pool, householdId, "completo");

    // Segundo membro via convite + aceite.
    const guest = await signUpUser(app, "m4.guest");
    await authed(app, "post", `/households/${householdId}/members/invite`, owner.accessToken)
      .send({ email: guest.email })
      .expect(201);
    const tokenRes = await pool.query(
      `SELECT token FROM public.household_invitations WHERE household_id = $1 AND email = $2 AND status = 'pending'`,
      [householdId, guest.email],
    );
    await authed(app, "post", "/invitations/accept", guest.accessToken)
      .send({ token: tokenRes.rows[0].token, dataSharingAcknowledged: true })
      .expect((res) => expect([200, 201]).toContain(res.status));

    // userId (public.users.id) de cada um, via /auth/me.
    const ownerMe = await authed(app, "get", "/auth/me", owner.accessToken).expect(200);
    const guestMe = await authed(app, "get", "/auth/me", guest.accessToken).expect(200);
    ownerUserId = ownerMe.body.id;
    guestUserId = guestMe.body.id;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  it("parcela 12x com split determinístico (1ª absorve a sobra) e datas mensais", async () => {
    const parcels = await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({
        type: "expense",
        amountCents: 120100,
        description: "Sofá",
        date: "2026-03-15",
        installmentCount: 12,
      })
      .expect(201);

    expect(Array.isArray(parcels.body)).toBe(true);
    expect(parcels.body).toHaveLength(12);

    const groupId = parcels.body[0].installmentGroupId;
    const all = (await listAll()).filter((t) => t.installmentGroupId === groupId);
    expect(all).toHaveLength(12);

    const byNumber = [...all].sort(
      (a, b) => (a.installmentNumber as number) - (b.installmentNumber as number),
    );
    // 120100 / 12 = 10008 base, resto 4 → 1ª = 10012, demais = 10008.
    expect(byNumber[0].amountCents).toBe(10012);
    expect(byNumber[1].amountCents).toBe(10008);
    expect(all.reduce((s, t) => s + (t.amountCents as number), 0)).toBe(120100);
    expect(byNumber.every((t) => t.installmentCount === 12)).toBe(true);
    // Datas avançam mês a mês.
    expect(byNumber[0].date).toBe("2026-03-15");
    expect(byNumber[1].date).toBe("2026-04-15");
    expect(byNumber[11].date).toBe("2027-02-15");
  });

  it("rateio igual entre 2 membros: fatia efetiva com sobra na 1ª", async () => {
    const tx = await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({
        type: "expense",
        amountCents: 10001,
        description: "Pizza",
        date: "2026-03-10",
        members: [{ userId: ownerUserId }, { userId: guestUserId }],
      })
      .expect(201);

    const list = await listAll();
    const listed = list.find((t) => t.id === tx.body.id);
    expect(listed!.memberCount).toBe(2);

    const members = await authed(
      app,
      "get",
      `/households/${householdId}/transactions/${tx.body.id}/members`,
      owner.accessToken,
    ).expect(200);
    expect(members.body).toHaveLength(2);
    expect(members.body.every((m: { shareAmountCents: number | null }) => m.shareAmountCents === null)).toBe(true);
    const effective = members.body.map((m: { effectiveShareCents: number }) => m.effectiveShareCents).sort();
    expect(effective).toEqual([5000, 5001]);
  });

  it("rateio específico que soma → ok; que não soma → 422", async () => {
    await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({
        type: "expense",
        amountCents: 9000,
        description: "Mercado dividido",
        date: "2026-03-11",
        members: [
          { userId: ownerUserId, shareAmountCents: 6000 },
          { userId: guestUserId, shareAmountCents: 3000 },
        ],
      })
      .expect(201);

    await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({
        type: "expense",
        amountCents: 9000,
        description: "Split errado",
        date: "2026-03-11",
        members: [
          { userId: ownerUserId, shareAmountCents: 6000 },
          { userId: guestUserId, shareAmountCents: 2000 },
        ],
      })
      .expect(422);
  });

  it("combinado: parcela 3x + rateio igual → cada parcela tem os membros", async () => {
    const parcels = await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({
        type: "expense",
        amountCents: 30000,
        description: "Viagem parcelada e dividida",
        date: "2026-05-01",
        installmentCount: 3,
        members: [{ userId: ownerUserId }, { userId: guestUserId }],
      })
      .expect(201);

    expect(parcels.body).toHaveLength(3);
    const firstParcelId = parcels.body[0].id;
    const members = await authed(
      app,
      "get",
      `/households/${householdId}/transactions/${firstParcelId}/members`,
      owner.accessToken,
    ).expect(200);
    expect(members.body).toHaveLength(2);
    // Cada parcela vale 10000 → dividido igualmente = 5000/5000.
    expect(
      members.body.map((m: { effectiveShareCents: number }) => m.effectiveShareCents).sort(),
    ).toEqual([5000, 5000]);
  });

  it("combinado: parcela + rateio específico → 422", async () => {
    await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({
        type: "expense",
        amountCents: 30000,
        description: "Combinação inválida",
        date: "2026-05-01",
        installmentCount: 3,
        members: [
          { userId: ownerUserId, shareAmountCents: 20000 },
          { userId: guestUserId, shareAmountCents: 10000 },
        ],
      })
      .expect(422);
  });

  it("excluir 1 parcela mantém as demais; excluir a série remove tudo", async () => {
    const parcels = await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({
        type: "expense",
        amountCents: 6000,
        description: "Curso 3x",
        date: "2026-06-01",
        installmentCount: 3,
      })
      .expect(201);
    const groupId = parcels.body[0].installmentGroupId;

    // Exclui só a 1ª parcela.
    await authed(
      app,
      "delete",
      `/households/${householdId}/transactions/${parcels.body[0].id}`,
      owner.accessToken,
    ).expect(204);
    let remaining = (await listAll()).filter((t) => t.installmentGroupId === groupId);
    expect(remaining).toHaveLength(2);

    // Exclui a série inteira.
    await authed(
      app,
      "delete",
      `/households/${householdId}/transactions/installment-groups/${groupId}`,
      owner.accessToken,
    ).expect(204);
    remaining = (await listAll()).filter((t) => t.installmentGroupId === groupId);
    expect(remaining).toHaveLength(0);
  });

  it("update substitui o rateio", async () => {
    const tx = await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({ type: "expense", amountCents: 8000, description: "Editar rateio", date: "2026-03-12" })
      .expect(201);

    await authed(app, "patch", `/households/${householdId}/transactions/${tx.body.id}`, owner.accessToken)
      .send({ members: [{ userId: ownerUserId }, { userId: guestUserId }] })
      .expect(200);

    const members = await authed(
      app,
      "get",
      `/households/${householdId}/transactions/${tx.body.id}/members`,
      owner.accessToken,
    ).expect(200);
    expect(members.body).toHaveLength(2);
  });

  it("não-membro recebe 403", async () => {
    const stranger = await signUpUser(app, "m4.stranger");
    await authed(app, "get", `/households/${householdId}/transactions`, stranger.accessToken).expect(403);
  });
});
