import { Inject, Injectable, Logger } from "@nestjs/common";
import { lastDayOfMonth } from "../../../../common/finance/due-date";
import { localHour, zonedNow } from "../../../../common/time/tz-clock";
import { DispatchNotificationUseCase } from "../../../notifications/application/use-cases/dispatch-notification.use-case";
import { NotificationDedupService } from "../../../notifications/application/notification-dedup.service";
import {
  IReportRepository,
  REPORT_REPOSITORY,
} from "../../domain/report.repository.interface";

export interface SendMonthlyReportResult {
  /** Households ativos avaliados neste tick. */
  scanned: number;
  /** Relatórios efetivamente despachados. */
  sent: number;
}

function periodKey(localNow: Date): string {
  return `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, "0")}`;
}

function isLastDayOfMonth(localNow: Date): boolean {
  return localNow.getDate() === lastDayOfMonth(localNow.getFullYear(), localNow.getMonth());
}

/**
 * Relatório mensal (M11 + M12): dispara `monthly_report` no último dia do mês
 * **no fuso de cada lar**, a partir da hora preferida local, com o resumo do
 * mês. Como o "último dia" e a hora diferem por fuso, o gate é por household
 * (sem early-return global). Dedup por household×mês (chave em data local),
 * reivindicado ANTES de calcular o relatório (evita reprocessar em re-tentativas).
 */
@Injectable()
export class SendMonthlyReportUseCase {
  private readonly logger = new Logger(SendMonthlyReportUseCase.name);

  constructor(
    @Inject(REPORT_REPOSITORY) private readonly reports: IReportRepository,
    private readonly dispatch: DispatchNotificationUseCase,
    private readonly dedup: NotificationDedupService,
  ) {}

  async execute(now: Date = new Date()): Promise<SendMonthlyReportResult> {
    const households = await this.reports.findAllActiveHouseholds();
    const result: SendMonthlyReportResult = { scanned: households.length, sent: 0 };

    for (const household of households) {
      const localNow = zonedNow(household.timezone, now);
      // Gate no fuso do lar: só no último dia do mês local e a partir da hora.
      if (!isLastDayOfMonth(localNow)) continue;
      if (localHour(household.timezone, now) < household.notificationHour) continue;

      const key = periodKey(localNow);
      const claimed = await this.dedup.claim(household.id, "monthly_report", household.id, key);
      if (!claimed) continue;

      const report = await this.reports.getMonthlyReportAdmin(household.id, localNow);
      const memberIds = await this.reports.findHouseholdMemberUserIds(household.id);

      const refBucket = report.months[report.months.length - 1] ?? {
        incomeCents: 0,
        expenseCents: 0,
      };
      const incomeCents = refBucket.incomeCents;
      const expenseCents = refBucket.expenseCents;

      await this.dispatch.execute({
        recipientUserIds: memberIds,
        householdId: household.id,
        type: "monthly_report",
        month: report.refMonth.month,
        year: report.refMonth.year,
        incomeCents,
        expenseCents,
        balanceCents: incomeCents - expenseCents,
        data: { month: report.refMonth.month, year: report.refMonth.year },
      });

      result.sent++;
    }

    if (result.sent > 0) {
      this.logger.log(`Relatório mensal: scanned=${result.scanned} sent=${result.sent}`);
    }

    return result;
  }
}
