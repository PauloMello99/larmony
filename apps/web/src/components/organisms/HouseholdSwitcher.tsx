import { ChevronsUpDown, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface HouseholdSwitcherProps {
  onClose?: () => void
}

export function HouseholdSwitcher({ onClose }: HouseholdSwitcherProps) {
  const { t } = useTranslation()
  const { households, activeHouseholdId, setActiveHouseholdId } = useAuth()

  const activeHousehold = households.find((h) => h.id === activeHouseholdId)

  if (households.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between px-3 font-normal text-sidebar-foreground border-sidebar-border bg-sidebar hover:bg-sidebar-accent"
        >
          <span className="truncate text-sm font-medium">
            {activeHousehold?.name ?? t('household.switcher.label')}
          </span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t('household.switcher.current')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {households.map((h) => (
          <DropdownMenuItem
            key={h.id}
            onSelect={() => {
              setActiveHouseholdId(h.id)
              onClose?.()
            }}
            className="flex items-center justify-between"
          >
            <span className="truncate">{h.name}</span>
            {h.id === activeHouseholdId && <Check className="ml-2 size-3.5 shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
