import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../database/database.module";
import { RECURRENCE_REPOSITORY } from "../domain/recurrence.repository.interface";
import { DrizzleRecurrenceRepository } from "./persistence/drizzle-recurrence.repository";

@Module({
  imports: [DatabaseModule],
  providers: [{ provide: RECURRENCE_REPOSITORY, useClass: DrizzleRecurrenceRepository }],
  exports: [RECURRENCE_REPOSITORY],
})
export class RecurrencesInfrastructureModule {}
