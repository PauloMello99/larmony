import { Inject, Injectable } from "@nestjs/common";
import {
  CATEGORY_REPOSITORY,
  ICategoryRepository,
} from "../../domain/category.repository.interface";
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(categoryId: string, householdId: string, authId: string): Promise<void> {
    await this.categoryRepo.delete(categoryId, householdId);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "delete",
      entityType: "category",
      entityId: categoryId,
    });
  }
}
