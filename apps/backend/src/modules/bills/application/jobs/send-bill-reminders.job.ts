import { Injectable } from "@nestjs/common";
import { CronJob, CronJobName } from "../../../internal-cron/cron-job";
import { SendBillRemindersUseCase } from "../use-cases/send-bill-reminders.use-case";

/** Plugado no tick do internal-cron via registry (ver cron-job.ts). */
@CronJobName("send-bill-reminders")
@Injectable()
export class SendBillRemindersJob implements CronJob {
  constructor(private readonly useCase: SendBillRemindersUseCase) {}

  run(): Promise<unknown> {
    return this.useCase.execute();
  }
}
