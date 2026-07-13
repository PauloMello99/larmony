import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { PlatformAdminGuard } from "../../auth/guards/platform-admin.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GrantCompUseCase } from "../application/use-cases/grant-comp.use-case";
import { RevokeCompUseCase } from "../application/use-cases/revoke-comp.use-case";
import { ApplyDiscountUseCase } from "../application/use-cases/apply-discount.use-case";
import { RemoveDiscountUseCase } from "../application/use-cases/remove-discount.use-case";
import { GrantTrialUseCase } from "../application/use-cases/grant-trial.use-case";
import { RevokeTrialUseCase } from "../application/use-cases/revoke-trial.use-case";
import { GrantCompDto } from "./dto/grant-comp.dto";
import { ApplyDiscountDto } from "./dto/apply-discount.dto";
import { GrantTrialDto } from "./dto/grant-trial.dto";

/**
 * Gestão administrativa de isenção/desconto por lar (B-7, ADR-0026 §5).
 * Restrito ao super_admin (`PlatformAdminGuard`) — toda ação é 100% aqui, o
 * operador nunca abre o dashboard do Stripe.
 */
@Controller("admin/households/:householdId/subscription")
@UseGuards(AuthGuard, PlatformAdminGuard)
export class AdminSubscriptionController {
  constructor(
    private readonly grantComp: GrantCompUseCase,
    private readonly revokeComp: RevokeCompUseCase,
    private readonly applyDiscount: ApplyDiscountUseCase,
    private readonly removeDiscount: RemoveDiscountUseCase,
    private readonly grantTrial: GrantTrialUseCase,
    private readonly revokeTrial: RevokeTrialUseCase,
  ) {}

  @Post("comp")
  @HttpCode(HttpStatus.NO_CONTENT)
  async grant(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Body() dto: GrantCompDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.grantComp.execute(
      householdId,
      { reason: dto.reason, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null },
      user.id,
    );
  }

  @Delete("comp")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.revokeComp.execute(householdId, user.id);
  }

  @Post("discount")
  @HttpCode(HttpStatus.NO_CONTENT)
  async discount(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Body() dto: ApplyDiscountDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.applyDiscount.execute(
      householdId,
      {
        percent: dto.percent,
        amountCents: dto.amountCents,
        duration: dto.duration,
        durationInMonths: dto.durationInMonths,
      },
      user.id,
    );
  }

  @Delete("discount")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDiscountAction(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.removeDiscount.execute(householdId, user.id);
  }

  @Post("trial")
  @HttpCode(HttpStatus.NO_CONTENT)
  async trial(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Body() dto: GrantTrialDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.grantTrial.execute(householdId, dto.months, user.id);
  }

  @Delete("trial")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeTrialAction(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.revokeTrial.execute(householdId, user.id);
  }
}
