import { createFileRoute, redirect } from '@tanstack/react-router'
import RegisterPage from '@/pages/auth/RegisterPage'
import { supabase } from '@/services/supabase'

export const Route = createFileRoute('/register')({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      throw redirect({ to: '/' })
    }
  },
  component: RegisterPage,
})
