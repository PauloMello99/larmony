import { Injectable } from '@nestjs/common'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SupabaseService {
  private readonly url: string
  private readonly anonKey: string

  constructor() {
    this.url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
    this.anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''

    if (!this.url || !this.anonKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
    }
  }

  /**
   * Creates a Supabase client scoped to the authenticated user's JWT.
   * RLS policies are enforced automatically — no extra auth checks needed.
   */
  getClientForUser(token: string): SupabaseClient {
    return createClient(this.url, this.anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    })
  }
}
