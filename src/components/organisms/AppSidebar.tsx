import { Link, useRouter } from '@tanstack/react-router'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tag,
  Target,
  PieChart,
  FileText,
  Home,
  Settings,
  LogOut,
  Wallet,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { HouseholdSwitcher } from '@/components/organisms/HouseholdSwitcher'

interface AppSidebarProps {
  className?: string
  onClose?: () => void
}

export function AppSidebar({ className, onClose }: AppSidebarProps) {
  const { t } = useTranslation()
  const { profile, signOut } = useAuth()
  const router = useRouter()

  const navItems = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard, exact: true },
    { to: '/transactions', label: t('nav.transactions'), icon: ArrowLeftRight },
    { to: '/categories', label: t('nav.categories'), icon: Tag },
    { to: '/budgets', label: t('nav.budgets'), icon: PieChart },
    { to: '/goals', label: t('nav.goals'), icon: Target },
    { to: '/bills', label: t('nav.bills'), icon: Wallet },
    { to: '/reports', label: t('nav.reports'), icon: FileText },
  ]

  const bottomNavItems = [
    { to: '/household', label: t('nav.household'), icon: Home },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ]

  const initials =
    profile?.full_name
      ?.split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase() ?? '?'

  const onSignOut = () => {
    signOut()
    onClose?.()
    router.navigate({ replace: true, to: '/login' })
  }

  return (
    <aside className={cn('flex h-full w-60 flex-col border-r bg-sidebar px-3 py-4', className)}>
      <div className="mb-4 flex items-center justify-between px-2">
        <h1 className="text-lg font-semibold text-sidebar-foreground">Home Finances</h1>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-sidebar-foreground md:hidden"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      <HouseholdSwitcher onClose={onClose} />

      <nav className="flex-1 space-y-1 mt-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onClose}
            activeProps={{ className: 'bg-sidebar-accent text-sidebar-accent-foreground' }}
            inactiveProps={{ className: 'text-sidebar-foreground hover:bg-sidebar-accent/50' }}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="space-y-1">
        <Separator className="my-2" />
        {bottomNavItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onClose}
            activeProps={{ className: 'bg-sidebar-accent text-sidebar-accent-foreground' }}
            inactiveProps={{ className: 'text-sidebar-foreground hover:bg-sidebar-accent/50' }}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        ))}

        <Separator className="my-2" />

        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="flex-1 truncate text-sm text-sidebar-foreground">
            {profile?.full_name ?? 'Usuário'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-sidebar-foreground hover:text-destructive"
            onClick={onSignOut}
            title={t('nav.signOut')}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
