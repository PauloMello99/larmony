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
import { BillsService } from './bills.service'

@Controller('api/bills')
@UseGuards(SupabaseAuthGuard)
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Get()
  findAll(@ReqSupabase() supabase: SupabaseClient, @Query('householdId') householdId: string) {
    return this.billsService.findAll(supabase, householdId)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @ReqSupabase() supabase: SupabaseClient,
    @Body() body: { householdId: string } & Record<string, unknown>,
  ) {
    const { householdId, ...payload } = body
    return this.billsService.create(supabase, householdId, payload)
  }

  @Put(':id')
  update(
    @ReqSupabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.billsService.update(supabase, id, payload)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@ReqSupabase() supabase: SupabaseClient, @Param('id') id: string) {
    return this.billsService.remove(supabase, id)
  }
}
