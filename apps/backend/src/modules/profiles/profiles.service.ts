import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class ProfilesService {
  async getMe(supabase: SupabaseClient) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) throw new UnauthorizedException()

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

    const { data: memberships } = await supabase
      .from('household_memberships')
      .select('household_id, role, households(id, name)')
      .eq('user_id', user.id)

    // households is a FK join — Supabase returns a single object, never an array.
    // Handle both shapes defensively so linters don't break this again.
    const households = (memberships ?? []).flatMap((m) => {
      if (!m.households) return []
      const raw = m.households as { id: string; name: string } | Array<{ id: string; name: string }>
      const items = Array.isArray(raw) ? raw : [raw]
      return items.map((h) => ({ id: h.id, name: h.name, role: m.role }))
    })

    return { profile, households }
  }

  async updateMe(supabase: SupabaseClient, payload: Record<string, unknown>) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) throw new UnauthorizedException()

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }
}
