import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { MailModule } from './infra/mail/mail.module'
import { AuthModule } from './modules/auth/auth.module'
import { BillsModule } from './modules/bills/bills.module'
import { BudgetsModule } from './modules/budgets/budgets.module'
import { CategoriesModule } from './modules/categories/categories.module'
import { GoalsModule } from './modules/goals/goals.module'
import { HouseholdInvitesModule } from './modules/household-invites/household-invites.module'
import { MembersModule } from './modules/members/members.module'
import { ProfilesModule } from './modules/profiles/profiles.module'
import { TransactionsModule } from './modules/transactions/transactions.module'

@Module({
  imports: [
    MailModule,
    AuthModule,
    BillsModule,
    BudgetsModule,
    CategoriesModule,
    GoalsModule,
    HouseholdInvitesModule,
    MembersModule,
    ProfilesModule,
    TransactionsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
