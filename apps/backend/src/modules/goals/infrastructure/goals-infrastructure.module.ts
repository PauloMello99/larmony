import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../database/database.module";
import { GOAL_REPOSITORY } from "../domain/goal.repository.interface";
import { DrizzleGoalRepository } from "./persistence/drizzle-goal.repository";

@Module({
  imports: [DatabaseModule],
  providers: [{ provide: GOAL_REPOSITORY, useClass: DrizzleGoalRepository }],
  exports: [GOAL_REPOSITORY],
})
export class GoalsInfrastructureModule {}
