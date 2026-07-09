import { Injectable } from "@nestjs/common";
import { CronJob, CronJobName } from "../../../internal-cron/cron-job";
import { RunScheduledEntriesEngineUseCase } from "../use-cases/run-scheduled-entries-engine.use-case";

/** Plugado no tick do internal-cron via registry (ver cron-job.ts). */
@CronJobName("scheduled-transactions-engine")
@Injectable()
export class ScheduledEntriesEngineJob implements CronJob {
  constructor(private readonly useCase: RunScheduledEntriesEngineUseCase) {}

  run(): Promise<unknown> {
    return this.useCase.execute();
  }
}
