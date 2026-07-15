"use client"

import * as React from "react"
import { useRouter } from "next/router"
import { useTranslation } from "react-i18next"
import { RefreshCw, Ban, RotateCcw, Search, Building2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Input } from "@/shared/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { ApiError } from "@/infrastructure/api/client"
import { translateApiError } from "@/shared/lib/api-error"
import { useAdminHouseholds } from "../hooks/use-admin"
import { fmtDate } from "../lib/format"
import { useDebouncedValue } from "../lib/use-debounced-value"
import { ConfirmDialog } from "./confirm-dialog"
import { SortHead } from "./sort-head"
import { PlanBadge } from "./plan-badge"
import type { AdminHousehold, AdminHouseholdFilters, SubscriptionPlanType } from "../types"

type StatusTab = "all" | "active" | "suspended"
type SortKey = NonNullable<AdminHouseholdFilters["sortBy"]>

const STATUS_TABS: { value: StatusTab; labelKey: string }[] = [
  { value: "all", labelKey: "households.tabAll" },
  { value: "active", labelKey: "households.tabActive" },
  { value: "suspended", labelKey: "households.tabSuspended" },
]

// M16: "trial" nunca mais é escrito (trial administrativo local foi
// removido no PR4 — trial hoje é self-serve via Stripe, type="standard" +
// status="trialing", indistinguível de qualquer outro pagante por `type`).
// Fora do filtro para não expor uma opção que nunca traz resultado.
const PLAN_OPTIONS: Array<SubscriptionPlanType | "all"> = [
  "all",
  "free",
  "standard",
  "custom",
]

export function AdminHouseholds() {
  const { t } = useTranslation("admin")
  const { t: tCommon } = useTranslation("common")
  const router = useRouter()

  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebouncedValue(query)
  const [status, setStatus] = React.useState<StatusTab>("all")
  const [plan, setPlan] = React.useState<SubscriptionPlanType | "all">("all")
  const [sortBy, setSortBy] = React.useState<SortKey>("createdAt")
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc")
  const [pageNum, setPageNum] = React.useState(1)

  // Filtro novo reseta a página (senão fica preso numa página que não existe).
  React.useEffect(() => {
    setPageNum(1)
  }, [debouncedQuery, status, plan])

  const filters: AdminHouseholdFilters = {
    page: pageNum,
    limit: 20,
    q: debouncedQuery.trim() || undefined,
    plan: plan === "all" ? undefined : plan,
    suspended: status === "all" ? undefined : status === "suspended",
    sortBy,
    sortDir,
  }
  const { page, loading, error, refetch, setSuspended } = useAdminHouseholds(filters)
  const rows = page?.data ?? []

  const [target, setTarget] = React.useState<AdminHousehold | null>(null)
  // 409 do backend → o diálogo vira a confirmação de cancelar no Stripe + suspender.
  const [needsCancel, setNeedsCancel] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(key)
      setSortDir(key === "name" ? "asc" : "desc")
    }
  }

  function closeDialog() {
    setTarget(null)
    setNeedsCancel(false)
    setActionError(null)
  }

  async function confirmToggle() {
    if (!target) return
    setBusy(true)
    setActionError(null)
    try {
      await setSuspended(target.id, target.suspendedAt === null, needsCancel || undefined)
      closeDialog()
    } catch (err) {
      if (err instanceof ApiError && err.code === "HOUSEHOLD_HAS_ACTIVE_SUBSCRIPTION") {
        setNeedsCancel(true)
      } else {
        setActionError(
          err instanceof Error ? translateApiError(err, tCommon) : t("households.updateError"),
        )
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t("households.title")}</h1>
          <p className="mt-0.5 text-sm text-foreground/40">
            {t("households.countSummary", { total: page?.total ?? 0, shown: rows.length })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void refetch()}
          disabled={loading}
          title={t("households.refresh")}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Toolbar: busca (nome/slug/e-mail do dono) + plano + status */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("households.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <div className="flex rounded-md border border-foreground/[0.08] p-0.5">
            {PLAN_OPTIONS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className={`rounded px-2.5 py-1.5 text-sm transition-colors ${
                  plan === p
                    ? "bg-foreground/[0.08] text-foreground"
                    : "text-foreground/50 hover:text-foreground"
                }`}
              >
                {p === "all" ? t("households.allPlans") : t(`households.plan_${p}`)}
              </button>
            ))}
          </div>
          <div className="flex rounded-md border border-foreground/[0.08] p-0.5">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatus(tab.value)}
                className={`rounded px-3 py-1.5 text-sm transition-colors ${
                  status === tab.value
                    ? "bg-foreground/[0.08] text-foreground"
                    : "text-foreground/50 hover:text-foreground"
                }`}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-foreground/[0.06]">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead label={t("households.colHousehold")} active={sortBy === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
              <TableHead>{t("households.colOwner")}</TableHead>
              <TableHead>{t("households.colPlan")}</TableHead>
              <SortHead label={t("households.colMembers")} active={sortBy === "memberCount"} dir={sortDir} onClick={() => toggleSort("memberCount")} align="right" />
              <SortHead label={t("households.colCreated")} active={sortBy === "createdAt"} dir={sortDir} onClick={() => toggleSort("createdAt")} />
              <TableHead className="text-right">{t("households.colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((o) => {
              const suspended = o.suspendedAt !== null
              return (
                <TableRow
                  key={o.id}
                  onClick={() => void router.push(`/admin/households/${o.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{o.name}</span>
                      {suspended && (
                        <Badge variant="destructive" className="bg-red-500/15 text-red-400">
                          {t("households.suspendedBadge")}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-foreground/40">/{o.slug}</span>
                  </TableCell>
                  <TableCell>
                    <span className="block text-foreground/70">{o.ownerName ?? "—"}</span>
                    {o.ownerEmail && (
                      <span className="text-xs text-foreground/40">{o.ownerEmail}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <PlanBadge plan={o.plan} status={o.subscriptionStatus} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-foreground/70">
                    {o.memberCount}
                  </TableCell>
                  <TableCell className="text-foreground/50">
                    {fmtDate(o.createdAt, t)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={suspended ? "outline" : "ghost"}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActionError(null)
                        setNeedsCancel(false)
                        setTarget(o)
                      }}
                      className={suspended ? "" : "text-red-400 hover:text-red-300"}
                    >
                      {suspended ? (
                        <>
                          <RotateCcw className="h-4 w-4" />
                          <span className="hidden sm:inline">{t("households.reactivate")}</span>
                        </>
                      ) : (
                        <>
                          <Ban className="h-4 w-4" />
                          <span className="hidden sm:inline">{t("households.suspend")}</span>
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Building2 className="h-6 w-6 text-foreground/20" />
            <p className="text-sm text-foreground/50">
              {(page?.total ?? 0) === 0 && !debouncedQuery && plan === "all" && status === "all"
                ? t("households.emptyNone")
                : t("households.emptyNoMatch")}
            </p>
          </div>
        )}
        {loading && (
          <div className="space-y-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse bg-foreground/[0.02]" />
            ))}
          </div>
        )}
      </div>

      {/* Paginação server-side (mesmo padrão do audit-logs) */}
      {page && page.pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm text-foreground/50">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={pageNum <= 1}
            onClick={() => setPageNum((p) => p - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs">
            {page.page} / {page.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={pageNum >= page.pages}
            onClick={() => setPageNum((p) => p + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(o) => !o && closeDialog()}
        title={
          needsCancel
            ? t("households.confirmCancelSuspendTitle", { name: target?.name })
            : target?.suspendedAt
              ? t("households.confirmReactivateTitle", { name: target.name })
              : t("households.confirmSuspendTitle", { name: target?.name })
        }
        description={
          needsCancel
            ? t("households.confirmCancelSuspendDescription")
            : target?.suspendedAt
              ? t("households.confirmReactivateDescription")
              : t("households.confirmSuspendDescription")
        }
        confirmLabel={
          needsCancel
            ? t("households.cancelAndSuspend")
            : target?.suspendedAt
              ? t("households.reactivate")
              : t("households.suspend")
        }
        destructive={!target?.suspendedAt}
        loading={busy}
        error={actionError}
        onConfirm={() => void confirmToggle()}
      />
    </div>
  )
}
