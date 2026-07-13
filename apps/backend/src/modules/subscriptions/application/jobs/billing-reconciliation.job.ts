import { Injectable } from "@nestjs/common";
import { CronJob, CronJobName } from "../../../internal-cron/cron-job";
import { ReconcileSubscriptionsUseCase } from "../use-cases/reconcile-subscriptions.use-case";

/** Plugado no tick do internal-cron via registry (ver cron-job.ts). */
@CronJobName("billing-reconciliation")
@Injectable()
export class BillingReconciliationJob implements CronJob {
  constructor(private readonly useCase: ReconcileSubscriptionsUseCase) {}

  run(): Promise<unknown> {
    return this.useCase.execute();
  }
}
