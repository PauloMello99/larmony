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
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { HouseholdMembershipGuard } from "../../auth/guards/household-membership.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GetMeUseCase } from "../../user/application/use-cases/get-me.use-case";
import { ListTransactionsUseCase } from "../application/use-cases/list-transactions.use-case";
import { CreateTransactionUseCase } from "../application/use-cases/create-transaction.use-case";
import { UpdateTransactionUseCase } from "../application/use-cases/update-transaction.use-case";
import { DeleteTransactionUseCase } from "../application/use-cases/delete-transaction.use-case";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";
import { ListTransactionsQueryDto } from "./dto/list-transactions-query.dto";

@Controller("households/:householdId/transactions")
@UseGuards(AuthGuard, HouseholdMembershipGuard)
export class TransactionsController {
  constructor(
    private readonly getMe: GetMeUseCase,
    private readonly listTransactions: ListTransactionsUseCase,
    private readonly createTransaction: CreateTransactionUseCase,
    private readonly updateTransaction: UpdateTransactionUseCase,
    private readonly deleteTransaction: DeleteTransactionUseCase,
  ) {}

  @Get()
  list(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Query() query: ListTransactionsQueryDto,
  ) {
    return this.listTransactions.execute(householdId, {
      month: query.month,
      year: query.year,
      type: query.type,
      categoryId: query.categoryId,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Post()
  async create(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @CurrentUser() authUser: AuthUser,
    @Body() dto: CreateTransactionDto,
  ) {
    const user = await this.getMe.execute(authUser);
    return this.createTransaction.execute(householdId, authUser.id, user.id, dto);
  }

  @Patch(":transactionId")
  update(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("transactionId", ParseUUIDPipe) transactionId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.updateTransaction.execute(transactionId, householdId, user.id, dto);
  }

  @Delete(":transactionId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("transactionId", ParseUUIDPipe) transactionId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.deleteTransaction.execute(transactionId, householdId, user.id);
  }
}
