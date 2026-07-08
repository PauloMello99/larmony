import { Inject, Injectable } from "@nestjs/common";
import type { CategoryEntity } from "../../domain/category.entity";
import {
  CATEGORY_REPOSITORY,
  ICategoryRepository,
  type CreateCategoryData,
} from "../../domain/category.repository.interface";
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    householdId: string,
    authId: string,
    data: CreateCategoryData,
  ): Promise<CategoryEntity> {
    const category = await this.categoryRepo.create(householdId, data);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "create",
      entityType: "category",
      entityId: category.id,
      metadata: { name: category.name, type: category.type },
    });

    return category;
  }
}
