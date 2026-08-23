import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  STATEMENT_IMPORT_ADMIN_REPOSITORY,
  type IStatementImportAdminRepository,
} from "../../domain/statement-import-admin.repository.interface";

export interface SweepStatementImportTimeoutsResult {
  timedOut: number;
}

// ADR-0034: 30s pra csv/ofx, 5min pra pdf — folga generosa sobre os 14-40s
// medidos na PoC do Docling.
const CSV_OFX_TIMEOUT = "30 seconds";
const PDF_TIMEOUT = "5 minutes";

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
