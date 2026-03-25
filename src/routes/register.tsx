import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import RegisterPage from '@/pages/auth/RegisterPage'
import { supabase } from '@/services/supabase'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/register')({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session) {
      throw redirect({ to: (search.redirect as string) ?? '/' })
    }
  },
  component: RegisterPage,
})
