import { Inject, Injectable } from "@nestjs/common";
import {
  BILL_REPOSITORY,
  IBillRepository,
  type BillListItem,
} from "../../domain/bill.repository.interface";

@Injectable()
export class ListBillsUseCase {
  constructor(
    @Inject(BILL_REPOSITORY) private readonly billRepo: IBillRepository,
  ) {}

  execute(householdId: string): Promise<BillListItem[]> {
    return this.billRepo.findAllByHousehold(householdId, new Date());
  }
}
