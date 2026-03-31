import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard'
import { ReqSupabase } from '../auth/decorators/supabase-client.decorator'
import { MembersService } from './members.service'

@Controller('api/members')
@UseGuards(SupabaseAuthGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  findAll(@ReqSupabase() supabase: SupabaseClient, @Query('householdId') householdId: string) {
    return this.membersService.findAll(supabase, householdId)
  }
}
