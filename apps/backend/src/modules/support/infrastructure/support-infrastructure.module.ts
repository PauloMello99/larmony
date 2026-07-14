import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../database/database.module";
import { SUPPORT_TICKET_REPOSITORY } from "../domain/support-ticket.repository.interface";
import { DrizzleSupportTicketRepository } from "./persistence/drizzle-support-ticket.repository";

@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: SUPPORT_TICKET_REPOSITORY, useClass: DrizzleSupportTicketRepository },
  ],
  exports: [SUPPORT_TICKET_REPOSITORY],
})
export class SupportInfrastructureModule {}
