import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard'
import { ReqSupabase } from '../auth/decorators/supabase-client.decorator'
import { ProfilesService } from './profiles.service'

@Controller('api/profiles')
@UseGuards(SupabaseAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  getMe(@ReqSupabase() supabase: SupabaseClient) {
    return this.profilesService.getMe(supabase)
  }

  @Patch('me')
  updateMe(
    @ReqSupabase() supabase: SupabaseClient,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.profilesService.updateMe(supabase, payload)
  }
}
