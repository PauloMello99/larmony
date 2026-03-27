import type { Context, Next } from 'hono'
import { createUserClient } from '../lib/supabase.js'

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const token = authHeader.slice(7)
  c.set('supabase', createUserClient(token))
  c.set('token', token)
  await next()
}
