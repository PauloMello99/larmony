import { Inject, Injectable, Logger } from "@nestjs/common";
import { lastDayOfMonth } from "../../../../common/finance/due-date";
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

function periodKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Relatório mensal (M11): dispara `monthly_report` no último dia do mês para
 * cada household ativo, com o resumo do mês (reusa a agregação de
 * `getMonthlyReport`). Timing em baseline UTC/relógio do processo — M12
 * substitui pelo timezone do household sem tocar este job (mesmo padrão de
 * `currentPeriodStart`). Dedup por household×mês, reivindicado ANTES de
 * calcular o relatório (evita reprocessar em re-tentativas do tick).
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
    if (now.getDate() !== lastDayOfMonth(now.getFullYear(), now.getMonth())) {
      return { scanned: 0, sent: 0 };
    }

    const householdIds = await this.reports.findAllActiveHouseholdIds();
    const result: SendMonthlyReportResult = { scanned: householdIds.length, sent: 0 };
    const key = periodKey(now);
    for (const householdId of householdIds) {
      const claimed = await this.dedup.claim(householdId, "monthly_report", householdId, key);
      if (!claimed) continue;

      const report = await this.reports.getMonthlyReportAdmin(householdId, now);
      const memberIds = await this.reports.findHouseholdMemberUserIds(householdId);

      const refBucket = report.months[report.months.length - 1] ?? {
        incomeCents: 0,
        expenseCents: 0,
      };
      const incomeCents = refBucket.incomeCents;
      const expenseCents = refBucket.expenseCents;

      await this.dispatch.execute({
        recipientUserIds: memberIds,
        householdId,
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
