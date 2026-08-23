import { Injectable } from "@nestjs/common";
import { CronJob, CronJobName } from "../../../internal-cron/cron-job";
import { SweepStatementImportTimeoutsUseCase } from "../use-cases/sweep-statement-import-timeouts.use-case";

/** Plugado no tick do internal-cron via registry (ver cron-job.ts). */
@CronJobName("statement-import-reconciliation")
@Injectable()
export class StatementImportReconciliationJob implements CronJob {
  constructor(private readonly useCase: SweepStatementImportTimeoutsUseCase) {}

  run(): Promise<unknown> {
    return this.useCase.execute();
  }
}
