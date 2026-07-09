import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./helpers";

/**
 * Guarda de acesso do tick do cron (`x-cron-secret`) — genérico, independente
 * dos jobs registrados. Cobertura por job (ex.: scheduled-transactions-engine/
 * -reminders) vive no e2e spec de cada módulo.
 */
describe("Cron (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("tick sem secret é bloqueado (401)", async () => {
    await request(app.getHttpServer()).post("/internal/cron/tick").expect(401);
  });

  it("tick com secret inválido é bloqueado (401)", async () => {
    await request(app.getHttpServer())
      .post("/internal/cron/tick")
      .set("x-cron-secret", "chave-errada")
      .expect(401);
  });
});
