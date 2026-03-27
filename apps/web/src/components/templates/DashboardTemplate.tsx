import { useState } from 'react'
import { Menu } from 'lucide-react'
import { AppSidebar } from '@/components/organisms/AppSidebar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'

interface DashboardTemplateProps {
  children: React.ReactNode
}

export function DashboardTemplate({ children }: DashboardTemplateProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar — hidden on mobile */}
      <AppSidebar className="hidden shrink-0 md:flex" />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </Button>
          <span className="font-semibold">Home Finances</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">{children}</div>
        </main>
      </div>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-60">
          <AppSidebar onClose={() => setMobileSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
