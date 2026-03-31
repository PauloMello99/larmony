import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { render } from '@react-email/render'
import * as React from 'react'
import { MailProvider } from '../../infra/mail/mail.provider'
import { InviteEmail } from '../../emails/InviteEmail'

@Injectable()
export class HouseholdInvitesService {
  constructor(private readonly mail: MailProvider) {}

  async sendInvite(supabase: SupabaseClient, householdId: string, email: string) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new UnauthorizedException()

    // Verify caller is owner of the household
    const { data: membership } = await supabase
      .from('household_memberships')
      .select('role')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'owner') {
      throw new ForbiddenException('Apenas donos podem enviar convites')
    }

    // Fetch household name for the email
    const { data: household } = await supabase
      .from('households')
      .select('name')
      .eq('id', householdId)
      .single()

    // Create the invite (token and expires_at handled by DB default/trigger)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: invite, error: inviteError } = await supabase
      .from('household_invites')
      .insert({
        household_id: householdId,
        email,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select('token')
      .single()

    if (inviteError || !invite) {
      throw new InternalServerErrorException(inviteError?.message ?? 'Erro ao criar convite')
    }

    // Send invite email
    const appUrl = process.env.APP_URL ?? 'http://localhost:5173'
    const inviteUrl = `${appUrl}/accept-invite?token=${invite.token}`
    const householdName = household?.name ?? 'Larmony'

    const html = await render(React.createElement(InviteEmail, { householdName, inviteUrl }))

    await this.mail.sendMail({
      to: email,
      subject: `Você foi convidado para o lar "${householdName}"`,
      html,
    })

    return { ok: true }
  }
}
