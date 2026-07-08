import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../database/database.module";
import { CATEGORY_REPOSITORY } from "../domain/category.repository.interface";
import { DrizzleCategoryRepository } from "./persistence/drizzle-category.repository";

@Module({
  imports: [DatabaseModule],
  providers: [{ provide: CATEGORY_REPOSITORY, useClass: DrizzleCategoryRepository }],
  exports: [CATEGORY_REPOSITORY],
})
export class CategoriesInfrastructureModule {}
