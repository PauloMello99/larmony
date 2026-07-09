"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { ShieldAlert } from "lucide-react"
import { TopHeader } from "@/features/dashboard/components/top-header"
import { HouseholdSidebar } from "@/features/dashboard/components/household-sidebar"
import { HouseholdSwitcher } from "@/features/dashboard/components/household-switcher"
import { HouseholdProvider } from "@/features/dashboard/components/household-context"
import { useHouseholds, useResolveHouseholdBySlug } from "@/features/dashboard/hooks/use-households"
import { useMe } from "@/features/auth/hooks/use-me"
import { Trans, useTranslation } from "react-i18next"
import { OnboardingProvider } from "@/features/onboarding/providers/onboarding-provider"
import { TourRenderer } from "@/features/onboarding/components/tour-renderer"
import {
  PAGE_LABEL_KEYS,
  isOwnerOnlyPath,
  isModuleKey,
  canAccessModule,
} from "@/features/dashboard/lib/nav"
import type { HouseholdSummary } from "@/features/dashboard/hooks/use-households"
import type { BreadcrumbItem } from "@/features/dashboard/components/top-header"

interface HouseholdLayoutProps {
  children: React.ReactNode
}

/**
 * Builds breadcrumb items for household pages, including settings sub-pages.
 *
 * /households/[householdSlug]/overview          → [HouseholdSwitcher, "Overview"]
 * /households/[householdSlug]/settings/billing  → [HouseholdSwitcher, "Configurações", "Cobrança"]
 */
function buildHouseholdCrumbs(
  pathname: string,
  slug: string,
  householdSwitcher: React.ReactNode,
  t: (key: string) => string,
): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [{ label: "Household", node: householdSwitcher }]

  const afterHousehold = pathname.split("/[householdSlug]/")[1] ?? ""
  const segments = afterHousehold.split("/").filter(Boolean)

  if (segments[0] === "settings") {
    crumbs.push({
      label: t("nav.settings"),
      href: `/households/${slug}/settings`,
    })
    const subKey = segments[1] ? PAGE_LABEL_KEYS[segments[1]] : undefined
    if (subKey) crumbs.push({ label: t(subKey) })
  } else {
    const pageKey = segments[0] ? PAGE_LABEL_KEYS[segments[0]] : undefined
    if (pageKey) crumbs.push({ label: t(pageKey) })
  }

  return crumbs
}

export function HouseholdLayout({ children }: HouseholdLayoutProps) {
  const router = useRouter()
  const { t } = useTranslation("dashboard")
  const { householdSlug } = router.query as { householdSlug?: string }
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const { me } = useMe()
  const { households, loading } = useHouseholds()
  const listHousehold: HouseholdSummary | undefined = households.find((o) => o.slug === householdSlug)

  // super_admin pode gerenciar uma household da qual não é membro: quando a slug não
  // está nas memberships, resolvemos por slug (backend devolve role "owner").
  const isSuper = me?.platformRole === "super_admin"
  const tryResolve = !!householdSlug && !loading && !listHousehold && isSuper
  const {
    household: resolvedHousehold,
    loading: resolving,
    notFound,
  } = useResolveHouseholdBySlug(householdSlug, tryResolve)

  // super_admin sempre opera como owner em qualquer household (paridade com o backend).
  const household: HouseholdSummary | undefined = React.useMemo(() => {
    const base = listHousehold ?? resolvedHousehold ?? undefined
    if (base && isSuper && base.role !== "owner") {
      return { ...base, role: "owner" as const }
    }
    return base
  }, [listHousehold, resolvedHousehold, isSuper])

  // Dono real da household (membership owner) — nesse caso o super_admin não está
  // "agindo em nome de", apenas tem o indicador sutil de plataforma.
  const isRealOwner = listHousehold?.role === "owner"
  const actingAsAdmin = isSuper && !isRealOwner // funcionário ou não-membro
  const superOwner = isSuper && isRealOwner // owner real + super_admin

  // Slug não pertence ao usuário e ele não é super_admin (ou a resolução falhou)
  // → volta para a lista de households.
  React.useEffect(() => {
    if (!householdSlug || loading || listHousehold) return
    if (!isSuper || (!resolving && notFound)) {
      void router.replace("/households")
    }
  }, [householdSlug, loading, listHousehold, isSuper, resolving, notFound, router])

  // Funcionário tentando acessar rota owner-only direto pela URL → manda p/ overview.
  // O backend já barra com 403; isto evita renderizar a casca de uma página proibida.
  // settings/agenda fica de fora (funcionário configura a própria agenda).
  const currentSubpath = router.pathname.split("/[householdSlug]/")[1] ?? ""
  React.useEffect(() => {
    if (!household || household.role === "owner") return
    const seg = currentSubpath.split("/")[0] ?? ""
    // Funcionário sem permissão no módulo (ou rota owner-only) → volta p/ overview.
    const lacksModule =
      isModuleKey(seg) && !canAccessModule(household.role, household.permissions, seg)
    if (isOwnerOnlyPath(currentSubpath) || lacksModule) {
      void router.replace(`/households/${household.slug}`)
    }
  }, [household, currentSubpath, router])

  // Close mobile sidebar on navigation
  React.useEffect(() => {
    setMobileOpen(false)
  }, [router.pathname])

  if (!household) return null

  const householdSwitcher = <HouseholdSwitcher household={household} />
  const breadcrumbs = buildHouseholdCrumbs(router.pathname, household.slug, householdSwitcher, t)

  return (
    <HouseholdProvider household={household} actingAsAdmin={actingAsAdmin}>
      <OnboardingProvider onRequestMobileNav={setMobileOpen}>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        {actingAsAdmin ? (
          // Funcionário ou não-membro agindo com poderes de plataforma → aviso forte.
          <div className="flex shrink-0 items-center justify-center gap-2 bg-warning/15 px-4 py-1.5 text-center text-xs text-warning sm:text-sm">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              <Trans
                t={t}
                i18nKey="adminBanner.managingAs"
                values={{ name: household.name }}
                components={{ strong: <strong className="font-semibold" /> }}
              />
            </span>
            <Link
              href={`/admin/households/${household.id}`}
              className="shrink-0 font-medium underline underline-offset-2 hover:opacity-80"
            >
              {t("adminBanner.backToPanel")}
            </Link>
          </div>
        ) : superOwner ? (
          // Dono real + super_admin → indicador sutil de contexto de plataforma.
          <div className="flex shrink-0 items-center justify-center gap-1.5 bg-foreground/[0.04] px-4 py-1 text-center text-[11px] text-foreground/40">
            <ShieldAlert className="h-3 w-3 shrink-0" />
            <span>{t("adminBanner.superAccess")}</span>
            <Link
              href="/admin"
              className="shrink-0 underline underline-offset-2 hover:text-foreground/70"
            >
              {t("userMenu.platformPanel")}
            </Link>
          </div>
        ) : null}
        <TopHeader
          breadcrumbs={breadcrumbs}
          onMobileMenuToggle={() => setMobileOpen((v) => !v)}
        />
        <div className="flex flex-1 overflow-hidden">
          <HouseholdSidebar
            household={household}
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
          />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">{children}</div>
          </main>
        </div>
      </div>
      <TourRenderer />
      </OnboardingProvider>
    </HouseholdProvider>
  )
}
