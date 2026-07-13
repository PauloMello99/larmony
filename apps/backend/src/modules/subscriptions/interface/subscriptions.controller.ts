import { Body, Controller, Get, Post, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { HouseholdMembershipGuard } from "../../auth/guards/household-membership.guard";
import { HouseholdOwnerGuard } from "../../auth/guards/household-owner.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GetSubscriptionUseCase } from "../application/use-cases/get-subscription.use-case";
import { CreateCheckoutSessionUseCase } from "../application/use-cases/create-checkout-session.use-case";
import { CreatePortalSessionUseCase } from "../application/use-cases/create-portal-session.use-case";
import { SessionLocaleDto } from "./dto/session-locale.dto";

@Controller("households/:householdId/subscription")
@UseGuards(AuthGuard, HouseholdMembershipGuard)
export class SubscriptionsController {
  constructor(
    private readonly getSubscription: GetSubscriptionUseCase,
    private readonly createCheckoutSession: CreateCheckoutSessionUseCase,
    private readonly createPortalSession: CreatePortalSessionUseCase,
  ) {}

  @Get()
  get(@Param("householdId", ParseUUIDPipe) householdId: string) {
    return this.getSubscription.execute(householdId);
  }

  @Post("checkout")
  @UseGuards(HouseholdOwnerGuard)
  checkout(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: SessionLocaleDto,
  ) {
    return this.createCheckoutSession.execute(householdId, user.email, dto.locale);
  }

  @Post("portal")
  @UseGuards(HouseholdOwnerGuard)
  portal(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Body() dto: SessionLocaleDto,
  ) {
    return this.createPortalSession.execute(householdId, dto.locale);
  }
}
