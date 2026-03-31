import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { HouseholdInvitesController } from './household-invites.controller'
import { HouseholdInvitesService } from './household-invites.service'

@Module({
  imports: [AuthModule],
  controllers: [HouseholdInvitesController],
  providers: [HouseholdInvitesService],
})
export class HouseholdInvitesModule {}
