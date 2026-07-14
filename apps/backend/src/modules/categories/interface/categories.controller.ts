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
import { HouseholdEntitlementGuard } from "../../subscriptions/interface/guards/household-entitlement.guard";
import { ActiveSubscriptionGuard } from "../../subscriptions/interface/guards/active-subscription.guard";
import { RequireCapability } from "../../subscriptions/interface/decorators/require-capability.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { ListCategoriesUseCase } from "../application/use-cases/list-categories.use-case";
import { CreateCategoryUseCase } from "../application/use-cases/create-category.use-case";
import { UpdateCategoryUseCase } from "../application/use-cases/update-category.use-case";
import { DeleteCategoryUseCase } from "../application/use-cases/delete-category.use-case";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

// ActiveSubscriptionGuard (M16): escrita exige assinatura ativa (locked → 402);
// GET livre. Criar categoria personalizada é Completo (custom_categories),
// gateado por método; editar/excluir as existentes fica no núcleo (Essencial+).
@Controller("households/:householdId/categories")
@UseGuards(AuthGuard, HouseholdMembershipGuard, ActiveSubscriptionGuard)
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

  // Categorias personalizadas são Family-only (régua do Free, D-1). As 13
  // categorias-padrão são semeadas direto na transação de criação do lar
  // (drizzle-household.repository.ts) — nunca passam por este endpoint —
  // então gatear a criação aqui não afeta o onboarding.
  @Post()
  @RequireCapability("custom_categories")
  @UseGuards(HouseholdEntitlementGuard)
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
