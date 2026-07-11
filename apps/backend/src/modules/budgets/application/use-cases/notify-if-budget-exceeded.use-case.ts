import { Inject, Injectable } from "@nestjs/common";
import {
  BUDGET_REPOSITORY,
  IBudgetRepository,
} from "../../domain/budget.repository.interface";
import { DispatchNotificationUseCase } from "../../../notifications/application/use-cases/dispatch-notification.use-case";
import { NotificationDedupService } from "../../../notifications/application/notification-dedup.service";

export interface CheckBudgetExceededInput {
  householdId: string;
  categoryId: string | null;
  type: "income" | "expense";
  /** Data da transação (ISO yyyy-MM-dd) — define QUAL mês/orçamento checar. */
  date: string;
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Evento "orçamento estourado" (M11) — event-driven, chamado logo após
 * qualquer escrita de transação (`CreateTransactionUseCase`,
 * `CreateInstallmentTransactionUseCase`, `CreateGeneratedTransactionUseCase` —
 * uma despesa auto também pode estourar). Resolve o limite vigente pelo
 * modelo versionado do M10 (`findBudgetForCategoryPeriod`); dedup 1×/
 * orçamento×mês, household-scoped (nunca por usuário — o fan-out por
 * destinatário é ortogonal). Se cair e reestourar no mesmo mês, não
 * re-alerta (explícito no v1).
 */
@Injectable()
export class NotifyIfBudgetExceededUseCase {
  constructor(
    @Inject(BUDGET_REPOSITORY) private readonly budgetRepo: IBudgetRepository,
    private readonly dispatch: DispatchNotificationUseCase,
    private readonly dedup: NotificationDedupService,
  ) {}

  async execute(input: CheckBudgetExceededInput): Promise<void> {
    if (input.type !== "expense" || !input.categoryId) return;

    const [year, month] = input.date.split("-").map(Number) as [number, number];
    const budget = await this.budgetRepo.findBudgetForCategoryPeriod(
      input.householdId,
      input.categoryId,
      month,
      year,
    );
    if (!budget || budget.spentCents <= budget.limitCents) return;

    const periodKey = `${year}-${String(month).padStart(2, "0")}`;
    const claimed = await this.dedup.claim(
      input.householdId,
      "budget_exceeded",
      budget.budgetId,
      periodKey,
    );
    if (!claimed) return;

    const memberIds = await this.budgetRepo.findHouseholdMemberUserIds(input.householdId);
    await this.dispatch.execute({
      recipientUserIds: memberIds,
      householdId: input.householdId,
      type: "budget_exceeded",
      title: `Orçamento de "${budget.categoryName}" estourado`,
      body: `Gasto de ${formatBRL(budget.spentCents)} superou o limite de ${formatBRL(budget.limitCents)}.`,
      data: { budgetId: budget.budgetId, categoryId: input.categoryId },
    });
  }
}
