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

    // If the user confirmed their email and came back without the invite token
    // in the URL, restore it from localStorage and redirect to accept the invite.
    const pendingToken = localStorage.getItem('hf:pendingInviteToken')
    if (pendingToken) {
      throw redirect({ to: '/accept-invite', search: { token: pendingToken } })
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
