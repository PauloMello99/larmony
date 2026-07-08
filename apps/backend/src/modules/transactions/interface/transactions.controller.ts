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
import { CreateInstallmentTransactionUseCase } from "../application/use-cases/create-installment-transaction.use-case";
import { UpdateTransactionUseCase } from "../application/use-cases/update-transaction.use-case";
import { DeleteTransactionUseCase } from "../application/use-cases/delete-transaction.use-case";
import { ListTransactionMembersUseCase } from "../application/use-cases/list-transaction-members.use-case";
import { DeleteInstallmentGroupUseCase } from "../application/use-cases/delete-installment-group.use-case";
import type { TransactionMemberInput } from "../domain/transaction.repository.interface";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";
import { TransactionMemberDto } from "./dto/transaction-member.dto";
import { ListTransactionsQueryDto } from "./dto/list-transactions-query.dto";

function toMemberInputs(members?: TransactionMemberDto[]): TransactionMemberInput[] | undefined {
  if (!members) return undefined;
  return members.map((m) => ({ userId: m.userId, shareAmountCents: m.shareAmountCents ?? null }));
}

@Controller("households/:householdId/transactions")
@UseGuards(AuthGuard, HouseholdMembershipGuard)
export class TransactionsController {
  constructor(
    private readonly getMe: GetMeUseCase,
    private readonly listTransactions: ListTransactionsUseCase,
    private readonly createTransaction: CreateTransactionUseCase,
    private readonly createInstallment: CreateInstallmentTransactionUseCase,
    private readonly updateTransaction: UpdateTransactionUseCase,
    private readonly deleteTransaction: DeleteTransactionUseCase,
    private readonly listMembers: ListTransactionMembersUseCase,
    private readonly deleteInstallmentGroup: DeleteInstallmentGroupUseCase,
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
    const members = toMemberInputs(dto.members);

    // Parcelamento (installmentCount > 1) vs transação única (com rateio opcional).
    if (dto.installmentCount && dto.installmentCount > 1) {
      return this.createInstallment.execute(householdId, authUser.id, user.id, {
        type: dto.type,
        amountCents: dto.amountCents,
        description: dto.description,
        date: dto.date,
        installmentCount: dto.installmentCount,
        categoryId: dto.categoryId,
        personId: dto.personId,
        notes: dto.notes,
        members,
      });
    }

    return this.createTransaction.execute(householdId, authUser.id, user.id, {
      type: dto.type,
      amountCents: dto.amountCents,
      description: dto.description,
      date: dto.date,
      categoryId: dto.categoryId,
      personId: dto.personId,
      notes: dto.notes,
      members,
    });
  }

  @Patch(":transactionId")
  update(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("transactionId", ParseUUIDPipe) transactionId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTransactionDto,
  ) {
    const { members, ...data } = dto;
    return this.updateTransaction.execute(
      transactionId,
      householdId,
      user.id,
      data,
      toMemberInputs(members),
    );
  }

  @Get(":transactionId/members")
  members(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("transactionId", ParseUUIDPipe) transactionId: string,
  ) {
    return this.listMembers.execute(transactionId, householdId);
  }

  // Rota estática antes de `:transactionId` — exclui a série inteira (cascade).
  @Delete("installment-groups/:groupId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSeries(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.deleteInstallmentGroup.execute(groupId, householdId, user.id);
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
