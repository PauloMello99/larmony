import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  IStatementProcessor,
  SubmitStatementImportJobInput,
  SubmitStatementImportJobResult,
} from "../domain/ports/statement-processor.port";

const PROCESSOR_TIMEOUT_MS = 5000;

@Injectable()
export class HttpStatementProcessor implements IStatementProcessor {
  constructor(private readonly config: ConfigService) {}

  async submitJob(input: SubmitStatementImportJobInput): Promise<SubmitStatementImportJobResult> {
    try {
      const callbackUrl = `${this.config.getOrThrow<string>("BACKEND_PUBLIC_URL")}/internal/statement-imports/${input.jobId}/callback`;

      const response = await fetch(
        `${this.config.getOrThrow<string>("STATEMENT_PROCESSOR_URL")}/jobs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-processor-secret": this.config.getOrThrow<string>("PROCESSOR_SHARED_SECRET"),
          },
          body: JSON.stringify({
            jobId: input.jobId,
            householdId: input.householdId,
            source: input.source,
            file: { encoding: "base64", data: input.fileBase64 },
            callbackUrl,
            context: input.context,
          }),
          signal: AbortSignal.timeout(PROCESSOR_TIMEOUT_MS),
        },
      );

      if (response.status === 202) return { accepted: true };

      // 400 do processor vem com {errorCode, errorMessage} estruturado
      // (ADR-0034 — INVALID_FILE/UNSUPPORTED_SOURCE) — repassa em vez de
      // mascarar como INTERNAL_ERROR, senão a revisão do usuário nunca vê o
      // motivo real da falha síncrona.
      if (response.status === 400) {
        const body = (await response.json().catch(() => null)) as {
          errorCode?: string;
          errorMessage?: string;
        } | null;
        if (body?.errorCode && body?.errorMessage) {
          return { accepted: false, errorCode: body.errorCode, errorMessage: body.errorMessage };
        }
      }

      return {
        accepted: false,
        errorCode: "INTERNAL_ERROR",
        errorMessage: `Processor respondeu com status inesperado: ${response.status}`,
      };
    } catch {
      // Processor fora do ar, timeout ou erro de rede nunca pode derrubar o
      // backend — vira falha síncrona do handshake (markFailedSync).
      return {
        accepted: false,
        errorCode: "INTERNAL_ERROR",
        errorMessage: "Falha ao comunicar com o statement-processor.",
      };
    }
  }
}
