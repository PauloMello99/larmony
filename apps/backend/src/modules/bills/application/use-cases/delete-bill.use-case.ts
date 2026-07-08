import { Inject, Injectable } from "@nestjs/common";
import {
  BILL_REPOSITORY,
  IBillRepository,
} from "../../domain/bill.repository.interface";
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class DeleteBillUseCase {
  constructor(
    @Inject(BILL_REPOSITORY) private readonly billRepo: IBillRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(billId: string, householdId: string, authId: string): Promise<void> {
    await this.billRepo.delete(billId, householdId);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "delete",
      entityType: "bill",
      entityId: billId,
    });
  }
}
