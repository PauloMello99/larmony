import { Injectable } from "@nestjs/common";
import { CronJob, CronJobName } from "../../../internal-cron/cron-job";
import { ExpireSubscriptionsUseCase } from "../use-cases/expire-subscriptions.use-case";

/** Plugado no tick do internal-cron via registry (ver cron-job.ts). */
@CronJobName("billing-expiry-sweep")
@Injectable()
export class BillingExpirySweepJob implements CronJob {
  constructor(private readonly useCase: ExpireSubscriptionsUseCase) {}

  run(): Promise<unknown> {
    return this.useCase.execute();
  }
}
