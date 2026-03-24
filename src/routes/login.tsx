import { createFileRoute, redirect } from '@tanstack/react-router'
import LoginPage from '@/pages/auth/LoginPage'
import { supabase } from '@/services/supabase'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})
