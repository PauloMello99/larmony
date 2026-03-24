import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { supabase } from '@/services/supabase'
import { DashboardTemplate } from '@/components/templates/DashboardTemplate'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw redirect({ to: '/login' })
    }
  },
  component: () => (
    <DashboardTemplate>
      <Outlet />
    </DashboardTemplate>
  ),
})
