import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import LoginPage from '@/pages/auth/LoginPage'
import { supabase } from '@/services/supabase'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/login')({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session) {
      const redirectUrl = search.redirect
      if (redirectUrl) {
        const parsed = new URL(redirectUrl, window.location.origin)
        const searchParams = Object.fromEntries(parsed.searchParams)
        throw redirect({
          to: parsed.pathname as '/',
          ...(Object.keys(searchParams).length > 0 ? { search: searchParams } : {}),
        })
      }
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})
