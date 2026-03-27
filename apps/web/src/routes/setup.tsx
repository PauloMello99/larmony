import { createFileRoute, redirect } from '@tanstack/react-router'
import SetupPage from '@/pages/SetupPage'
import { supabase } from '@/services/supabase'

export const Route = createFileRoute('/setup')({
  beforeLoad: async () => {
    // Must be authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) throw redirect({ to: '/login' })

    // If already has a household, go to dashboard
    const { data: membership } = await supabase
      .from('household_memberships')
      .select('household_id')
      .eq('user_id', session.user.id)
      .limit(1)
      .single()

    if (membership) throw redirect({ to: '/' })
  },
  component: SetupPage,
})
