import { IsArray, IsIn, IsObject, IsString, ValidateIf } from "class-validator";
import type {
  StatementImportCallbackStats,
  StatementImportCallbackTransaction,
} from "../../application/use-cases/process-statement-import-callback.use-case";

/**
 * Espelha `ProcessStatementImportCallbackInput` (ADR-0034). `transactions` e
 * `stats` ficam com validação estrutural rasa (`@IsArray()`/`@IsObject()`,
 * sem DTO aninhado) de propósito: o `ValidationPipe` global roda com
 * `whitelist: true`, que apaga silenciosamente qualquer propriedade sem
 * decorator dentro de uma classe aninhada — decorar campo a campo aqui
 * arriscaria zerar `stats.total`/`transactions[].amountCents` sem erro
 * nenhum. Payload interno do processor (não input de usuário final), então o
 * ganho de uma validação profunda não paga esse risco.
 */
export class StatementImportCallbackDto {
  @IsIn(["completed", "failed"])
  status!: "completed" | "failed";

  @ValidateIf((o: StatementImportCallbackDto) => o.status === "completed")
  @IsArray()
  transactions?: StatementImportCallbackTransaction[];

  @ValidateIf((o: StatementImportCallbackDto) => o.status === "completed")
  @IsObject()
  stats?: StatementImportCallbackStats;

  @ValidateIf((o: StatementImportCallbackDto) => o.status === "failed")
  @IsString()
  errorCode?: string;

  @ValidateIf((o: StatementImportCallbackDto) => o.status === "failed")
  @IsString()
  errorMessage?: string;
}
