import { Inject, Injectable } from "@nestjs/common";
import {
  BILL_REPOSITORY,
  IBillRepository,
  type BillListItem,
  type CreateBillData,
} from "../../domain/bill.repository.interface";
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class CreateBillUseCase {
  constructor(
    @Inject(BILL_REPOSITORY) private readonly billRepo: IBillRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    householdId: string,
    authId: string,
    data: CreateBillData,
  ): Promise<BillListItem> {
    const bill = await this.billRepo.create(householdId, data);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "create",
      entityType: "bill",
      entityId: bill.id,
      metadata: { name: bill.name, amountCents: bill.amountCents },
    });

    return bill;
  }
}
