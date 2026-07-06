import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";
import { TransactionsModule } from "../transactions/transactions.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { BillsInfrastructureModule } from "./infrastructure/bills-infrastructure.module";
import { SendBillRemindersUseCase } from "./application/use-cases/send-bill-reminders.use-case";
import { SendBillRemindersJob } from "./application/jobs/send-bill-reminders.job";
import { ListBillsUseCase } from "./application/use-cases/list-bills.use-case";
import { CreateBillUseCase } from "./application/use-cases/create-bill.use-case";
import { UpdateBillUseCase } from "./application/use-cases/update-bill.use-case";
import { DeleteBillUseCase } from "./application/use-cases/delete-bill.use-case";
import { LaunchBillAsTransactionUseCase } from "./application/use-cases/launch-bill-as-transaction.use-case";
import { BillsController } from "./interface/bills.controller";

@Module({
  imports: [
    AuthModule,
    UserModule,
    TransactionsModule,
    BillsInfrastructureModule,
    NotificationsModule,
  ],
  controllers: [BillsController],
  providers: [
    // Fatia cron (já entregue)
    SendBillRemindersUseCase,
    SendBillRemindersJob,
    // CRUD + launch (M7 completo)
    ListBillsUseCase,
    CreateBillUseCase,
    UpdateBillUseCase,
    DeleteBillUseCase,
    LaunchBillAsTransactionUseCase,
  ],
})
export class BillsModule {}
