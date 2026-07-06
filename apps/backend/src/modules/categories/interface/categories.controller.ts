import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { HouseholdMembershipGuard } from "../../auth/guards/household-membership.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { ListCategoriesUseCase } from "../application/use-cases/list-categories.use-case";
import { CreateCategoryUseCase } from "../application/use-cases/create-category.use-case";
import { UpdateCategoryUseCase } from "../application/use-cases/update-category.use-case";
import { DeleteCategoryUseCase } from "../application/use-cases/delete-category.use-case";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@Controller("households/:householdId/categories")
@UseGuards(AuthGuard, HouseholdMembershipGuard)
export class CategoriesController {
  constructor(
    private readonly listCategories: ListCategoriesUseCase,
    private readonly createCategory: CreateCategoryUseCase,
    private readonly updateCategory: UpdateCategoryUseCase,
    private readonly deleteCategory: DeleteCategoryUseCase,
  ) {}

  @Get()
  list(@Param("householdId", ParseUUIDPipe) householdId: string) {
    return this.listCategories.execute(householdId);
  }

  @Post()
  create(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.createCategory.execute(householdId, user.id, dto);
  }

  @Patch(":categoryId")
  update(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.updateCategory.execute(categoryId, householdId, user.id, dto);
  }

  @Delete(":categoryId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.deleteCategory.execute(categoryId, householdId, user.id);
  }
}
