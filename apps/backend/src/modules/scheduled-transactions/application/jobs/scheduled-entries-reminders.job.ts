import { Injectable } from "@nestjs/common";
import { CronJob, CronJobName } from "../../../internal-cron/cron-job";
import { SendScheduledEntryRemindersUseCase } from "../use-cases/send-scheduled-entry-reminders.use-case";

/** Plugado no tick do internal-cron via registry (ver cron-job.ts). */
@CronJobName("scheduled-transactions-reminders")
@Injectable()
export class ScheduledEntriesRemindersJob implements CronJob {
  constructor(private readonly useCase: SendScheduledEntryRemindersUseCase) {}

  run(): Promise<unknown> {
    return this.useCase.execute();
  }
}
