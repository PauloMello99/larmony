import { AppSidebar } from '@/components/organisms/layout/AppSidebar'

interface DashboardTemplateProps {
  children: React.ReactNode
}

export function DashboardTemplate({ children }: DashboardTemplateProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar className="shrink-0" />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
