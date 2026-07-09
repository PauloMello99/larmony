"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { cn } from "@/shared/lib/utils"
import { useCurrentHousehold } from "@/features/dashboard/components/household-context"
import { useTranslation } from "react-i18next"
import { SETTINGS_NAV } from "@/features/dashboard/lib/nav"

interface HouseholdSettingsLayoutProps {
  children: React.ReactNode
}

export function HouseholdSettingsLayout({ children }: HouseholdSettingsLayoutProps) {
  const router = useRouter()
  const { t } = useTranslation("dashboard")
  const { household } = useCurrentHousehold()
  const basePath = `/households/${household.slug}`

  // Funcionário só vê as seções que pode acessar (ex.: Agenda).
  const navItems = SETTINGS_NAV.filter(
    (item) => !item.roles || item.roles.includes(household.role),
  )

  const isActive = (href: string) => router.pathname.endsWith("/" + href)

  return (
    <div className="flex min-h-full flex-col gap-6 md:flex-row md:gap-8">
      {/* Mobile: horizontal tab bar */}
      <nav className="flex gap-1 overflow-x-auto border-b border-foreground/[0.06] pb-3 md:hidden">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={`${basePath}/${item.href}`}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                active
                  ? "bg-foreground/[0.08] text-foreground"
                  : "text-foreground/50 hover:bg-foreground/[0.04] hover:text-foreground",
              )}
            >
              {t(item.labelKey)}
            </Link>
          )
        })}
      </nav>

      {/* Desktop: submenu fixo à esquerda (sticky) */}
      <aside className="hidden w-48 shrink-0 md:block">
        <div className="sticky top-6">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-foreground/25">
            {t("nav.settings")}
          </p>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={`${basePath}/${item.href}`}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-foreground/[0.08] text-foreground"
                        : "text-foreground/50 hover:bg-foreground/[0.04] hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-primary" : "text-foreground/40",
                      )}
                    />
                    {t(item.labelKey)}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </aside>

      {/* Conteúdo centralizado, com largura máxima */}
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-3xl">{children}</div>
      </div>
    </div>
  )
}
