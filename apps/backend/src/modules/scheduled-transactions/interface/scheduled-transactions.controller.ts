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
import { RequireCapability } from "../../subscriptions/interface/decorators/require-capability.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GetMeUseCase } from "../../user/application/use-cases/get-me.use-case";
import { ListScheduledEntriesUseCase } from "../application/use-cases/list-scheduled-entries.use-case";
import { CreateScheduledEntryUseCase } from "../application/use-cases/create-scheduled-entry.use-case";
import { UpdateScheduledEntryUseCase } from "../application/use-cases/update-scheduled-entry.use-case";
import { DeleteScheduledEntryUseCase } from "../application/use-cases/delete-scheduled-entry.use-case";
import { LaunchScheduledEntryUseCase } from "../application/use-cases/launch-scheduled-entry.use-case";
import { CreateScheduledEntryDto } from "./dto/create-scheduled-entry.dto";
import { UpdateScheduledEntryDto } from "./dto/update-scheduled-entry.dto";

// Lançamentos programados são uma feature Completo (M16): gate de capability a
// nível de classe bloqueia Essencial e locked em TODAS as rotas com 402.
@Controller("households/:householdId/scheduled-transactions")
@RequireCapability("scheduled_entries")
@UseGuards(AuthGuard, HouseholdMembershipGuard, HouseholdEntitlementGuard)
export class ScheduledTransactionsController {
  constructor(
    private readonly getMe: GetMeUseCase,
    private readonly listEntries: ListScheduledEntriesUseCase,
    private readonly createEntry: CreateScheduledEntryUseCase,
    private readonly updateEntry: UpdateScheduledEntryUseCase,
    private readonly deleteEntry: DeleteScheduledEntryUseCase,
    private readonly launchEntry: LaunchScheduledEntryUseCase,
  ) {}

  @Get()
  list(@Param("householdId", ParseUUIDPipe) householdId: string) {
    return this.listEntries.execute(householdId);
  }

  @Post()
  async create(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @CurrentUser() authUser: AuthUser,
    @Body() dto: CreateScheduledEntryDto,
  ) {
    // Resolve o users.id interno (carimbo de createdBy/personId nas tx geradas).
    const user = await this.getMe.execute(authUser);
    return this.createEntry.execute(householdId, authUser.id, user.id, dto);
  }

  @Patch(":entryId")
  update(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("entryId", ParseUUIDPipe) entryId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateScheduledEntryDto,
  ) {
    return this.updateEntry.execute(entryId, householdId, user.id, dto);
  }

  @Delete(":entryId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("entryId", ParseUUIDPipe) entryId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.deleteEntry.execute(entryId, householdId, user.id);
  }

  @Post(":entryId/launch")
  async launch(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("entryId", ParseUUIDPipe) entryId: string,
    @CurrentUser() authUser: AuthUser,
  ) {
    const user = await this.getMe.execute(authUser);
    return this.launchEntry.execute(entryId, householdId, authUser.id, user.id);
  }
}
