import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../database/database.module";
import { SCHEDULED_ENTRY_REPOSITORY } from "../domain/scheduled-entry.repository.interface";
import { DrizzleScheduledEntryRepository } from "./persistence/drizzle-scheduled-entry.repository";

@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: SCHEDULED_ENTRY_REPOSITORY, useClass: DrizzleScheduledEntryRepository },
  ],
  exports: [SCHEDULED_ENTRY_REPOSITORY],
})
export class ScheduledTransactionsInfrastructureModule {}
