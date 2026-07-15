import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { TelemetryService } from "./common/telemetry/telemetry.service";

async function bootstrap() {
  // rawBody: expõe req.rawBody (Buffer) para a verificação de assinatura do
  // webhook do Stripe (POST /webhooks/stripe) — o parse JSON das outras rotas
  // segue normal (ver stripe-webhook.controller.ts, M14/ADR-0026).
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Headers de segurança (ADR-0027, defesa em profundidade): API JSON pura —
  // os defaults do helmet (nosniff, frameguard, HSTS atrás de TLS etc.)
  // bastam; a CSP relevante para XSS é a do frontend (next.config.js).
  app.use(helmet());

  app.enableCors({
    origin: process.env["FRONTEND_URL"] ?? "http://localhost:3000",
    credentials: true,
  });

  const telemetry = app.get(TelemetryService);

  app.useGlobalFilters(new AllExceptionsFilter(telemetry));

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  app.enableShutdownHooks();

  process.on("unhandledRejection", (reason) => {
    telemetry.captureException(reason, {
      module: "process",
      kind: "unhandledRejection",
    });
  });
  process.on("uncaughtException", (error) => {
    telemetry.captureException(error, {
      module: "process",
      kind: "uncaughtException",
    });
  });

  const port = process.env["PORT"] ?? 3001;
  await app.listen(port);
}

bootstrap();
