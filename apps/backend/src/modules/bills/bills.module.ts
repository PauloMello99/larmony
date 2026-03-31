import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { BillsController } from './bills.controller'
import { BillsService } from './bills.service'

@Module({
  imports: [AuthModule],
  controllers: [BillsController],
  providers: [BillsService],
})
export class BillsModule {}
