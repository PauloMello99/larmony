import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { CategoriesInfrastructureModule } from "./infrastructure/categories-infrastructure.module";
import { ListCategoriesUseCase } from "./application/use-cases/list-categories.use-case";
import { CreateCategoryUseCase } from "./application/use-cases/create-category.use-case";
import { UpdateCategoryUseCase } from "./application/use-cases/update-category.use-case";
import { DeleteCategoryUseCase } from "./application/use-cases/delete-category.use-case";
import { CategoriesController } from "./interface/categories.controller";

@Module({
  imports: [AuthModule, CategoriesInfrastructureModule, SubscriptionsModule],
  controllers: [CategoriesController],
  providers: [
    ListCategoriesUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
  ],
})
export class CategoriesModule {}
