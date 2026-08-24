import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  STATEMENT_IMPORT_ADMIN_REPOSITORY,
  type IStatementImportAdminRepository,
} from "../../domain/statement-import-admin.repository.interface";

export interface SweepStatementImportTimeoutsResult {
  timedOut: number;
}

// ADR-0034: 30s pra csv/ofx. Os "14-40s" da PoC eram POR PÁGINA, não por
// documento -- achado real da Fase 3 (medido com Docling+EasyOCR de
// verdade, sem GPU): um PDF escaneado de 6 páginas levou ~6-8min de ponta
// a ponta, e cachear o modelo entre jobs não reduz isso (é OCR por página,
// não custo de carregar modelo — o carregamento em si é ~segundos).
// 20min dá folga real sobre o pior caso medido (6 páginas); extratos com
// muito mais páginas ainda podem estourar isso — um mecanismo de
// heartbeat/progresso do processor seria a correção definitiva, fora do
// escopo desta fase.
const CSV_OFX_TIMEOUT = "30 seconds";
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
