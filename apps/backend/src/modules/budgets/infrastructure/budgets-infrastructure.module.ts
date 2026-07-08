import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../database/database.module";
import { BUDGET_REPOSITORY } from "../domain/budget.repository.interface";
import { DrizzleBudgetRepository } from "./persistence/drizzle-budget.repository";

@Module({
  imports: [DatabaseModule],
  providers: [{ provide: BUDGET_REPOSITORY, useClass: DrizzleBudgetRepository }],
  exports: [BUDGET_REPOSITORY],
})
export class BudgetsInfrastructureModule {}
