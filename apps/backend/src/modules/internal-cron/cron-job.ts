import { DiscoveryService } from "@nestjs/core";

/**
 * Contrato de um job do cron unificado (POST /internal/cron/tick, 15min).
 *
 * Para plugar um job, a feature declara um provider no PRÓPRIO módulo —
 * sem tocar em nada do internal-cron:
 *
 *   @CronJobName("send-bill-reminders")
 *   @Injectable()
 *   export class SendBillRemindersJob implements CronJob {
 *     constructor(private readonly useCase: SendBillRemindersUseCase) {}
 *     run() { return this.useCase.execute(); }
 *   }
 *
 * O CronJobsService descobre todos os providers decorados via DiscoveryService.
 * Jobs planejados: M7 `send-bill-reminders` (bills), M9 `recurrence-engine`.
 */
export interface CronJob {
  run(): Promise<unknown>;
}

/** Decorator que registra o provider como job do tick, com seu nome público. */
export const CronJobName = DiscoveryService.createDecorator<string>();
