import { Inject, Injectable } from "@nestjs/common";
import type { BudgetEntity } from "../../domain/budget.entity";
import {
  BUDGET_REPOSITORY,
  IBudgetRepository,
  type CreateBudgetData,
} from "../../domain/budget.repository.interface";
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class CreateBudgetUseCase {
  constructor(
    @Inject(BUDGET_REPOSITORY) private readonly budgetRepo: IBudgetRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    householdId: string,
    authId: string,
    data: CreateBudgetData,
  ): Promise<BudgetEntity> {
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
