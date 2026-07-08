import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../database/database.module";
import { BILL_REPOSITORY } from "../domain/bill.repository.interface";
import { DrizzleBillRepository } from "./persistence/drizzle-bill.repository";

@Module({
  imports: [DatabaseModule],
  providers: [{ provide: BILL_REPOSITORY, useClass: DrizzleBillRepository }],
  exports: [BILL_REPOSITORY],
})
export class BillsInfrastructureModule {}
