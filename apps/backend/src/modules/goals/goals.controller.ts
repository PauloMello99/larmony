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
import { GoalsService } from './goals.service'

@Controller('api/goals')
@UseGuards(SupabaseAuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  findAll(@ReqSupabase() supabase: SupabaseClient, @Query('householdId') householdId: string) {
    return this.goalsService.findAll(supabase, householdId)
  }

  @Get(':id/contributions')
  findContributions(@ReqSupabase() supabase: SupabaseClient, @Param('id') id: string) {
    return this.goalsService.findContributions(supabase, id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @ReqSupabase() supabase: SupabaseClient,
    @Body() body: { householdId: string } & Record<string, unknown>,
  ) {
    const { householdId, ...payload } = body
    return this.goalsService.create(supabase, householdId, payload)
  }

  @Post(':id/contributions')
  @HttpCode(HttpStatus.CREATED)
  createContribution(
    @ReqSupabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body() body: { householdId: string; userId: string } & Record<string, unknown>,
  ) {
    const { householdId, userId, ...payload } = body
    return this.goalsService.createContribution(supabase, id, householdId, userId, payload)
  }

  @Put(':id')
  update(
    @ReqSupabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.goalsService.update(supabase, id, payload)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@ReqSupabase() supabase: SupabaseClient, @Param('id') id: string) {
    return this.goalsService.remove(supabase, id)
  }
}
