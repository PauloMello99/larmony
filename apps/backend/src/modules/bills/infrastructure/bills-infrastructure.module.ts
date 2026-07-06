import { Module } from "@nestjs/common";
import { BILL_REPOSITORY } from "../domain/bill.repository.interface";
import { DrizzleBillRepository } from "./persistence/drizzle-bill.repository";

@Module({
  providers: [{ provide: BILL_REPOSITORY, useClass: DrizzleBillRepository }],
  exports: [BILL_REPOSITORY],
})
export class BillsInfrastructureModule {}
