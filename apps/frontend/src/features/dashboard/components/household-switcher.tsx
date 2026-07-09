"use client"

import { useRouter } from "next/router"
import { useTranslation } from "react-i18next"
import { Check, ChevronsUpDown, Building2 } from "lucide-react"
import { useHouseholds } from "@/features/dashboard/hooks/use-households"
import type { HouseholdSummary } from "@/features/dashboard/hooks/use-households"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

interface HouseholdSwitcherProps {
  household: HouseholdSummary
}

export function HouseholdSwitcher({ household }: HouseholdSwitcherProps) {
  const { t } = useTranslation("dashboard")
  const { households } = useHouseholds()
  const router = useRouter()

  // Keep the same sub-path in the new household by replacing the slug in the query.
  const handleSelect = (slug: string) => {
    if (slug === household.slug) return
    void router.push({
      pathname: router.pathname, // e.g. /households/[householdSlug]/members
      query: { ...router.query, householdSlug: slug },
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto gap-1.5 px-2 py-1 text-sm font-medium text-foreground hover:bg-foreground/[0.06]"
        >
          {household.name}
          <ChevronsUpDown className="h-3.5 w-3.5 text-foreground/40" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest">
          {t("switcher.label")}
        </DropdownMenuLabel>
        {households.map((o) => (
          <DropdownMenuItem key={o.id} onClick={() => handleSelect(o.slug)}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/20 text-[10px] font-bold text-primary">
              {o.name.charAt(0).toUpperCase()}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
              <span className="truncate">{o.name}</span>
              <span className="text-[10px] text-foreground/30">
                {o.role === "owner" ? t("roles.owner") : t("roles.member")}
              </span>
            </span>
            {o.id === household.id && (
              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void router.push("/households")}
        >
          <Building2 className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
          <span className="flex-1">{t("switcher.viewAll")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
