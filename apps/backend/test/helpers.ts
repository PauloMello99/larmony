import "dotenv/config";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Pool } from "pg";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { TelemetryService } from "../src/common/telemetry/telemetry.service";

/** App Nest real (AppModule inteiro), com o mesmo bootstrap global do main.ts. */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  // rawBody: mesmo do main.ts — os e2e do webhook do Stripe precisam do
  // req.rawBody para a verificação de assinatura.
  const app = moduleRef.createNestApplication({ rawBody: true });
  app.useGlobalFilters(new AllExceptionsFilter(app.get(TelemetryService)));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

/** Pool admin (BYPASSRLS) para seeds/inspeção/cleanup nos testes. */
export function adminPool(): Pool {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL não setada (apps/backend/.env)");
  return new Pool({ connectionString: url });
}

let seq = 0;
/** E-mail único por run+caso (evita colisão entre execuções no mesmo banco). */
export function uniqueEmail(prefix: string): string {
  seq += 1;
  return `${prefix}.${Date.now()}.${seq}@e2e.larmony.local`;
}

export interface TestUser {
  email: string;
  password: string;
  accessToken: string;
  userId: string;
}

/** Cadastra e autentica um usuário de teste; retorna o access token. */
export async function signUpUser(
  app: INestApplication,
  prefix: string,
): Promise<TestUser> {
  const email = uniqueEmail(prefix);
  const password = "SenhaForteE2e123!";
  const res = await request(app.getHttpServer())
    .post("/auth/sign-up")
    .send({ name: `E2E ${prefix}`, email, password, termsAccepted: true })
    .expect(201);

  const accessToken: string =
    res.body.session?.accessToken ?? res.body.accessToken;
  const userId: string = res.body.user?.id ?? res.body.id;
  if (!accessToken) throw new Error("sign-up não retornou accessToken");
  return { email, password, accessToken, userId };
}

export function authed(
  app: INestApplication,
  method: "get" | "post" | "patch" | "put" | "delete",
  url: string,
  token: string,
) {
  return request(app.getHttpServer())[method](url).set("Authorization", `Bearer ${token}`);
}

/**
 * Remove os usuários de e2e criados (auth + public via DELETE /auth/me exige
 * token; aqui limpamos via SQL admin + admin API do GoTrue não é necessária —
 * o e-mail único evita colisão; a limpeza é best-effort do public.users, e o
 * cascade das FKs (memberships/households órfãos) é coberto pelo teste).
 */
export async function cleanupByEmailPattern(pool: Pool): Promise<void> {
  await pool.query(
    `DELETE FROM public.users WHERE email LIKE '%@e2e.larmony.local'`,
  );
}
