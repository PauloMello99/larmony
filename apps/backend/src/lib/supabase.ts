import { createClient } from '@supabase/supabase-js'

// SUPABASE_URL can be shared with VITE_SUPABASE_URL in the monorepo .env
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
// SUPABASE_ANON_KEY can be shared with VITE_SUPABASE_ANON_KEY in the monorepo .env
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) / SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY)')
}

/**
 * Creates a Supabase client scoped to the authenticated user's JWT.
 * RLS policies are enforced automatically — no extra auth checks needed.
 */
export function createUserClient(token: string) {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })
}
