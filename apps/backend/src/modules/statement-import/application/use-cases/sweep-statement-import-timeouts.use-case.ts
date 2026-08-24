import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  STATEMENT_IMPORT_ADMIN_REPOSITORY,
  type IStatementImportAdminRepository,
} from "../../domain/statement-import-admin.repository.interface";

export interface SweepStatementImportTimeoutsResult {
  timedOut: number;
}

// ADR-0034: 60s pra csv/ofx (bump de 30s -> 60s na Fase 4) -- a camada 6
// (LLM fallback via Groq) soma tempo real em cima das camadas 1-5, e o
// orçamento por-fase do processor (_LLM_BUDGET_SECONDS em pipeline.py) não
// desconta o que as camadas 1-4 já gastaram (achado da revisão da Fase 4).
// Auditoria de tempo real (2026-08-24, chamadas reais a BrasilAPI e Groq,
// fora de carga concorrente -- ver [[domain-rules]]): caminho feliz é da
// ordem de 1-2s no total (CNPJ→CNAE ~31-157ms/chamada, Groq ~1-1,5s por
// batch de 20) -- 60s dá folga generosa pro caso comum; o risco real que
// pode consumir esse orçamento é retry+backoff em cascata quando o rate
// limit da Groq (8000 tokens/min/org) é estourado por jobs concorrentes,
// não medido aqui. Os "14-40s" da PoC de PDF eram POR PÁGINA, não por documento --
// achado real da Fase 3 (medido com Docling+EasyOCR de verdade, sem GPU):
// um PDF escaneado de 6 páginas levou ~6-8min de ponta a ponta, e cachear
// o modelo entre jobs não reduz isso (é OCR por página, não custo de
// carregar modelo — o carregamento em si é ~segundos). 20min dá folga real
// sobre o pior caso medido (6 páginas); extratos com muito mais páginas
// ainda podem estourar isso — um mecanismo de heartbeat/progresso do
// processor seria a correção definitiva, fora do escopo desta fase.
const CSV_OFX_TIMEOUT = "60 seconds";
const PDF_TIMEOUT = "20 minutes";

/** Plugado no tick do internal-cron via StatementImportReconciliationJob. */
@Injectable()
export class SweepStatementImportTimeoutsUseCase {
  private readonly logger = new Logger(SweepStatementImportTimeoutsUseCase.name);

  constructor(
    @Inject(STATEMENT_IMPORT_ADMIN_REPOSITORY)
    private readonly adminRepo: IStatementImportAdminRepository,
  ) {}

  async execute(): Promise<SweepStatementImportTimeoutsResult> {
    const timedOut = await this.adminRepo.sweepTimeouts(CSV_OFX_TIMEOUT, PDF_TIMEOUT);

    if (timedOut.length > 0) {
      this.logger.log(`Reconciliação de timeout: ${timedOut.length} job(s) marcados como failed.`);
    }

    return { timedOut: timedOut.length };
  }
}
