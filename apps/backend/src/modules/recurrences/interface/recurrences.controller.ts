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
import { GetMeUseCase } from "../../user/application/use-cases/get-me.use-case";
import { ListRecurrencesUseCase } from "../application/use-cases/list-recurrences.use-case";
import { CreateRecurrenceUseCase } from "../application/use-cases/create-recurrence.use-case";
import { UpdateRecurrenceUseCase } from "../application/use-cases/update-recurrence.use-case";
import { DeleteRecurrenceUseCase } from "../application/use-cases/delete-recurrence.use-case";
import { CreateRecurrenceDto } from "./dto/create-recurrence.dto";
import { UpdateRecurrenceDto } from "./dto/update-recurrence.dto";

@Controller("households/:householdId/recurrences")
@UseGuards(AuthGuard, HouseholdMembershipGuard)
export class RecurrencesController {
  constructor(
    private readonly getMe: GetMeUseCase,
    private readonly listRecurrences: ListRecurrencesUseCase,
    private readonly createRecurrence: CreateRecurrenceUseCase,
    private readonly updateRecurrence: UpdateRecurrenceUseCase,
    private readonly deleteRecurrence: DeleteRecurrenceUseCase,
  ) {}

  @Get()
  list(@Param("householdId", ParseUUIDPipe) householdId: string) {
    return this.listRecurrences.execute(householdId);
  }

  @Post()
  async create(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @CurrentUser() authUser: AuthUser,
    @Body() dto: CreateRecurrenceDto,
  ) {
    // Resolve o users.id interno (carimbo de createdBy/personId nas tx geradas).
    const user = await this.getMe.execute(authUser);
    return this.createRecurrence.execute(householdId, authUser.id, user.id, dto);
  }

  @Patch(":recurrenceId")
  update(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("recurrenceId", ParseUUIDPipe) recurrenceId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateRecurrenceDto,
  ) {
    return this.updateRecurrence.execute(recurrenceId, householdId, user.id, dto);
  }

  @Delete(":recurrenceId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("recurrenceId", ParseUUIDPipe) recurrenceId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.deleteRecurrence.execute(recurrenceId, householdId, user.id);
  }
}
