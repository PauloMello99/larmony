import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard'
import { ReqSupabase } from '../auth/decorators/supabase-client.decorator'
import type { SupabaseClient } from '@supabase/supabase-js'
import { HouseholdInvitesService } from './household-invites.service'

class SendInviteBody {
  householdId!: string
  email!: string
}

@Controller('api/household-invites')
@UseGuards(SupabaseAuthGuard)
export class HouseholdInvitesController {
  constructor(private readonly invitesService: HouseholdInvitesService) {}

  @Post()
  sendInvite(@ReqSupabase() supabase: SupabaseClient, @Body() body: SendInviteBody) {
    return this.invitesService.sendInvite(supabase, body.householdId, body.email)
  }
}
