import { Link } from '@tanstack/react-router'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/transactions', label: 'Transações', icon: ArrowLeftRight },
  { to: '/categories', label: 'Categorias', icon: Tag },
  { to: '/budgets', label: 'Orçamentos', icon: PieChart },
  { to: '/goals', label: 'Metas', icon: Target },
  { to: '/bills', label: 'Contas a Pagar', icon: Wallet },
  { to: '/reports', label: 'Relatórios', icon: FileText },
]

const bottomNavItems = [
  { to: '/household', label: 'Meu Lar', icon: Home },
  { to: '/settings', label: 'Configurações', icon: Settings },
]

export function AppSidebar({ className }: { className?: string }) {
  const { profile, signOut } = useAuth()
  const initials = profile?.full_name
    ?.split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() ?? '?'

  return (
    <aside className={cn('flex h-full w-60 flex-col border-r bg-sidebar px-3 py-4', className)}>
      <div className="mb-6 px-2">
        <h1 className="text-lg font-semibold text-sidebar-foreground">Home Finances</h1>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
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
            onClick={signOut}
            title="Sair"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
