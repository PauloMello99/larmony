import { Inject, Injectable } from "@nestjs/common";
import {
  BILL_REPOSITORY,
  IBillRepository,
  type BillListItem,
  type UpdateBillData,
} from "../../domain/bill.repository.interface";
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class UpdateBillUseCase {
  constructor(
    @Inject(BILL_REPOSITORY) private readonly billRepo: IBillRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    billId: string,
    householdId: string,
    authId: string,
    data: UpdateBillData,
  ): Promise<BillListItem> {
    const bill = await this.billRepo.update(billId, householdId, data);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "update",
      entityType: "bill",
      entityId: billId,
      metadata: { fields: Object.keys(data) },
    });

    return bill;
  }
}
