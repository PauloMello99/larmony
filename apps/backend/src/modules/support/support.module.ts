import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SupportInfrastructureModule } from "./infrastructure/support-infrastructure.module";
import { CreateSupportTicketUseCase } from "./application/use-cases/create-support-ticket.use-case";
import { ListMySupportTicketsUseCase } from "./application/use-cases/list-my-support-tickets.use-case";
import { GetMySupportTicketUseCase } from "./application/use-cases/get-my-support-ticket.use-case";
import { ReplyToMySupportTicketUseCase } from "./application/use-cases/reply-to-my-support-ticket.use-case";
import { ListSupportTicketsUseCase } from "./application/use-cases/list-support-tickets.use-case";
import { GetSupportTicketUseCase } from "./application/use-cases/get-support-ticket.use-case";
import { ReplyAsAdminUseCase } from "./application/use-cases/reply-as-admin.use-case";
import { SetSupportTicketStatusUseCase } from "./application/use-cases/set-support-ticket-status.use-case";
import { SupportController } from "./interface/support.controller";
import { AdminSupportController } from "./interface/admin-support.controller";

@Module({
  imports: [AuthModule, UserModule, SupportInfrastructureModule, NotificationsModule],
  controllers: [SupportController, AdminSupportController],
  providers: [
    CreateSupportTicketUseCase,
    ListMySupportTicketsUseCase,
    GetMySupportTicketUseCase,
    ReplyToMySupportTicketUseCase,
    ListSupportTicketsUseCase,
    GetSupportTicketUseCase,
    ReplyAsAdminUseCase,
    SetSupportTicketStatusUseCase,
  ],
})
export class SupportModule {}
