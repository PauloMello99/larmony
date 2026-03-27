import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { supabase } from '@/services/supabase'
import { DashboardTemplate } from '@/components/templates/DashboardTemplate'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw redirect({ to: '/login' })
    }

    const { data: membership } = await supabase
      .from('household_memberships')
      .select('household_id')
      .eq('user_id', session.user.id)
      .limit(1)
      .single()

    if (!membership) {
      throw redirect({ to: '/setup' })
    }
  },
  component: () => (
    <DashboardTemplate>
      <Outlet />
    </DashboardTemplate>
  ),
})
