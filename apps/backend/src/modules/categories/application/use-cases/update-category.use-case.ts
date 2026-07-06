import { Inject, Injectable } from "@nestjs/common";
import type { CategoryEntity } from "../../domain/category.entity";
import {
  CATEGORY_REPOSITORY,
  ICategoryRepository,
  type UpdateCategoryData,
} from "../../domain/category.repository.interface";
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    categoryId: string,
    householdId: string,
    authId: string,
    data: UpdateCategoryData,
  ): Promise<CategoryEntity> {
    const category = await this.categoryRepo.update(categoryId, householdId, data);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "update",
      entityType: "category",
      entityId: categoryId,
      metadata: { fields: Object.keys(data) },
    });

    return category;
  }
}
