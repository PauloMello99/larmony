import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard'
import { ReqSupabase } from '../auth/decorators/supabase-client.decorator'
import { BudgetsService } from './budgets.service'

@Controller('api/budgets')
@UseGuards(SupabaseAuthGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  findAll(
    @ReqSupabase() supabase: SupabaseClient,
    @Query('householdId') householdId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.budgetsService.findAll(supabase, householdId, month, year)
  }

  @Get('spending')
  getSpending(
    @ReqSupabase() supabase: SupabaseClient,
    @Query('householdId') householdId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.budgetsService.getSpending(supabase, householdId, month, year)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @ReqSupabase() supabase: SupabaseClient,
    @Body() body: { householdId: string } & Record<string, unknown>,
  ) {
    const { householdId, ...payload } = body
    return this.budgetsService.create(supabase, householdId, payload)
  }

  @Put(':id')
  update(
    @ReqSupabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.budgetsService.update(supabase, id, payload)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@ReqSupabase() supabase: SupabaseClient, @Param('id') id: string) {
    return this.budgetsService.remove(supabase, id)
  }
}
