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
import { TransactionsService } from './transactions.service'

@Controller('api/transactions')
@UseGuards(SupabaseAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  findAll(
    @ReqSupabase() supabase: SupabaseClient,
    @Query('householdId') householdId: string,
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    return this.transactionsService.findAll(supabase, {
      householdId,
      month,
      year,
      type,
      categoryId,
      search,
    })
  }

  @Get('summary')
  getSummary(
    @ReqSupabase() supabase: SupabaseClient,
    @Query('householdId') householdId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.transactionsService.getSummary(supabase, householdId, month, year)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @ReqSupabase() supabase: SupabaseClient,
    @Body() body: { householdId: string; userId: string } & Record<string, unknown>,
  ) {
    const { householdId, userId, ...payload } = body
    return this.transactionsService.create(supabase, householdId, userId, payload)
  }

  @Put(':id')
  update(
    @ReqSupabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.transactionsService.update(supabase, id, payload)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@ReqSupabase() supabase: SupabaseClient, @Param('id') id: string) {
    return this.transactionsService.remove(supabase, id)
  }
}
