import { Inject, Injectable } from "@nestjs/common";
import type { BudgetEntity } from "../../domain/budget.entity";
import {
  BUDGET_REPOSITORY,
  IBudgetRepository,
} from "../../domain/budget.repository.interface";
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class UpdateBudgetUseCase {
  constructor(
    @Inject(BUDGET_REPOSITORY) private readonly budgetRepo: IBudgetRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    budgetId: string,
    householdId: string,
    authId: string,
    amountCents: number,
  ): Promise<BudgetEntity> {
    const budget = await this.budgetRepo.upsertCurrentVersion(budgetId, householdId, amountCents);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "update",
      entityType: "budget",
      entityId: budgetId,
      metadata: { amountCents },
    });

    return budget;
  }
}
