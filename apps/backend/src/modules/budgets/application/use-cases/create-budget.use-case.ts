import { Inject, Injectable } from "@nestjs/common";
import type { BudgetEntity } from "../../domain/budget.entity";
import {
  BUDGET_REPOSITORY,
  IBudgetRepository,
  type CreateBudgetData,
} from "../../domain/budget.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import { EntitlementsService } from "../../../subscriptions/application/entitlements.service";
import { BudgetLimitReachedException } from "../../domain/exceptions/budget-limit-reached.exception";

@Injectable()
export class CreateBudgetUseCase {
  constructor(
    @Inject(BUDGET_REPOSITORY) private readonly budgetRepo: IBudgetRepository,
    private readonly auditService: AuditService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async execute(
    householdId: string,
    authId: string,
    data: CreateBudgetData,
  ): Promise<BudgetEntity> {
    // Régua do Free (D-1, P-5): séries ATIVAS (endedFrom IS NULL) — encerrar
    // uma série existente libera criar outra dentro do limite.
    const { limits } = await this.entitlements.resolve(householdId);
    const activeCount = await this.budgetRepo.countActiveSeries(householdId);
    if (activeCount >= limits.maxActiveBudgets) {
      throw new BudgetLimitReachedException(limits.maxActiveBudgets);
    }

    const budget = await this.budgetRepo.create(householdId, data);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "create",
      entityType: "budget",
      entityId: budget.id,
      metadata: { categoryId: budget.categoryId, amountCents: data.amountCents },
    });

    return budget;
  }
}
