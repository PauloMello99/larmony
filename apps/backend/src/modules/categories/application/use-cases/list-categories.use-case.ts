import { Inject, Injectable } from "@nestjs/common";
import type { CategoryEntity } from "../../domain/category.entity";
import {
  CATEGORY_REPOSITORY,
  ICategoryRepository,
} from "../../domain/category.repository.interface";

@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository,
  ) {}

  execute(householdId: string): Promise<CategoryEntity[]> {
    return this.categoryRepo.findAllByHousehold(householdId);
  }
}
