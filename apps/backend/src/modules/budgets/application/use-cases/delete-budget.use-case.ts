import { Inject, Injectable } from "@nestjs/common";
import {
  BUDGET_REPOSITORY,
  IBudgetRepository,
} from "../../domain/budget.repository.interface";
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class DeleteBudgetUseCase {
  constructor(
    @Inject(BUDGET_REPOSITORY) private readonly budgetRepo: IBudgetRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(budgetId: string, householdId: string, authId: string): Promise<void> {
    await this.budgetRepo.endSeries(budgetId, householdId);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "delete",
      entityType: "budget",
      entityId: budgetId,
    });
  }
}
