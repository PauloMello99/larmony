import { Injectable } from "@nestjs/common";
import { CronJob, CronJobName } from "../../../internal-cron/cron-job";
import { RunRecurrenceEngineUseCase } from "../use-cases/run-recurrence-engine.use-case";

/** Plugado no tick do internal-cron via registry (ver cron-job.ts). */
@CronJobName("recurrence-engine")
@Injectable()
export class RecurrenceEngineJob implements CronJob {
  constructor(private readonly useCase: RunRecurrenceEngineUseCase) {}

  run(): Promise<unknown> {
    return this.useCase.execute();
  }
}
