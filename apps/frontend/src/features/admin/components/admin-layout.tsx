"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { useTranslation } from "react-i18next"
import { LayoutDashboard, Building2, Users, Shield, ArrowLeft, Loader2, ShieldCheck, LifeBuoy } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { useMe } from "@/features/auth/hooks/use-me"
import { UserMenu } from "@/features/dashboard/components/user-menu"
import { AppBackground } from "@/shared/components/app-background"
import { useAdminSupportTickets } from "../hooks/use-admin"

// Billing saiu do nav (M15): admin é centrado em LARES — a gestão de
// assinatura vive na aba Assinatura do detalhe de cada lar.
const NAV = [
  { href: "/admin", labelKey: "layout.navOverview", icon: LayoutDashboard },
  { href: "/admin/households", labelKey: "layout.navHouseholds", icon: Building2 },
  { href: "/admin/users", labelKey: "layout.navUsers", icon: Users },
  { href: "/admin/support", labelKey: "layout.navSupport", icon: LifeBuoy },
  { href: "/admin/audit-logs", labelKey: "layout.navAuditLogs", icon: Shield },
]

/**
 * Layout do painel da plataforma (PLAT-1). NÃO é household-scoped. Faz o guard de
 * acesso (super_admin) via /auth/me e oferece a navegação entre as seções.
 */
export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("admin")
  const router = useRouter()
  const { me, loading } = useMe()
  const isSuperAdmin = me?.platformRole === "super_admin"
  const { page: openTickets } = useAdminSupportTickets({ status: "open", limit: 1 }, isSuperAdmin)
  const openTicketsCount = openTickets?.total ?? 0

  React.useEffect(() => {
    if (!loading && me && !isSuperAdmin) {
      void router.replace("/households")
    }
  }, [loading, me, isSuperAdmin, router])

  if (loading || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center text-foreground/30">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-foreground/40">
        {t("layout.accessRestricted")}
      </div>
    )
  }

  const isActive = (href: string) =>
    href === "/admin"
      ? router.pathname === "/admin"
      : router.pathname.startsWith(href)

  return (
    <div className="relative min-h-screen bg-background">
      <AppBackground />
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-foreground/[0.06] bg-background/70 px-4 py-2.5 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            larmony <span className="text-foreground/40">{t("layout.platformSuffix")}</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/households"
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-foreground/50 transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t("layout.backToApp")}</span>
          </Link>
          <UserMenu />
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row md:gap-8">
        {/* Sub-nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-foreground/[0.06] pb-3 md:w-48 md:flex-col md:border-b-0 md:pb-0">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
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
                {item.href === "/admin/support" && openTicketsCount > 0 && (
                  <span className="ml-auto flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
                    {openTicketsCount > 9 ? "9+" : openTicketsCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
