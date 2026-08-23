import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { ProcessorSecretGuard } from "../../../common/guards/processor-secret.guard";
import {
  ProcessStatementImportCallbackUseCase,
  type ProcessStatementImportCallbackInput,
} from "../application/use-cases/process-statement-import-callback.use-case";
import { StatementImportCallbackDto } from "./dto/statement-import-callback.dto";

/**
 * Callback assíncrono do processor (ADR-0034) — sem sessão de usuário,
 * protegido por segredo compartilhado (ProcessorSecretGuard), mesmo padrão
 * de rota interna do webhook Stripe. `jobId` da URL é a fonte de verdade
 * (ignora qualquer `jobId` que o body eventualmente traga).
 */
@Controller("internal/statement-imports")
@UseGuards(ProcessorSecretGuard)
@SkipThrottle()
export class StatementImportCallbackController {
  constructor(private readonly processCallback: ProcessStatementImportCallbackUseCase) {}

  @Post(":jobId/callback")
  @HttpCode(HttpStatus.OK)
  async handle(
    @Param("jobId", ParseUUIDPipe) jobId: string,
    @Body() dto: StatementImportCallbackDto,
  ): Promise<{ received: boolean }> {
    await this.processCallback.execute({
      ...dto,
      jobId,
    } as ProcessStatementImportCallbackInput);
    return { received: true };
  }
}
