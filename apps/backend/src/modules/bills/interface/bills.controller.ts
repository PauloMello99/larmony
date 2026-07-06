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
import { ListBillsUseCase } from "../application/use-cases/list-bills.use-case";
import { CreateBillUseCase } from "../application/use-cases/create-bill.use-case";
import { UpdateBillUseCase } from "../application/use-cases/update-bill.use-case";
import { DeleteBillUseCase } from "../application/use-cases/delete-bill.use-case";
import { LaunchBillAsTransactionUseCase } from "../application/use-cases/launch-bill-as-transaction.use-case";
import { CreateBillDto } from "./dto/create-bill.dto";
import { UpdateBillDto } from "./dto/update-bill.dto";

@Controller("households/:householdId/bills")
@UseGuards(AuthGuard, HouseholdMembershipGuard)
export class BillsController {
  constructor(
    private readonly getMe: GetMeUseCase,
    private readonly listBills: ListBillsUseCase,
    private readonly createBill: CreateBillUseCase,
    private readonly updateBill: UpdateBillUseCase,
    private readonly deleteBill: DeleteBillUseCase,
    private readonly launchBillAsTransaction: LaunchBillAsTransactionUseCase,
  ) {}

  @Get()
  list(@Param("householdId", ParseUUIDPipe) householdId: string) {
    return this.listBills.execute(householdId);
  }

  @Post()
  create(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBillDto,
  ) {
    return this.createBill.execute(householdId, user.id, dto);
  }

  @Patch(":billId")
  update(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("billId", ParseUUIDPipe) billId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateBillDto,
  ) {
    return this.updateBill.execute(billId, householdId, user.id, dto);
  }

  @Delete(":billId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("billId", ParseUUIDPipe) billId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.deleteBill.execute(billId, householdId, user.id);
  }

  @Post(":billId/launch")
  async launch(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("billId", ParseUUIDPipe) billId: string,
    @CurrentUser() authUser: AuthUser,
  ) {
    const user = await this.getMe.execute(authUser);
    return this.launchBillAsTransaction.execute(billId, householdId, authUser.id, user.id);
  }
}
