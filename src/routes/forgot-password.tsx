import { createFileRoute, redirect } from '@tanstack/react-router'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import { supabase } from '@/services/supabase'

export const Route = createFileRoute('/forgot-password')({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session) throw redirect({ to: '/' })
  },
  component: ForgotPasswordPage,
})
