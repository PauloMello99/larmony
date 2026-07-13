"use client"

import * as React from "react"
import { useRouter } from "next/router"
import { useTranslation } from "react-i18next"
import { RefreshCw, Ban, RotateCcw, Search, Building2 } from "lucide-react"
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
import { translateApiError } from "@/shared/lib/api-error"
import { useAdminHouseholds } from "../hooks/use-admin"
import { fmtDate } from "../lib/format"
import { useDebouncedValue } from "../lib/use-debounced-value"
import { ConfirmDialog } from "./confirm-dialog"
import { SortHead } from "./sort-head"
import type { AdminHousehold, HouseholdSortKey, HouseholdStatusFilter, SortDir } from "../types"

const STATUS_TABS: { value: HouseholdStatusFilter; labelKey: string }[] = [
  { value: "all", labelKey: "households.tabAll" },
  { value: "active", labelKey: "households.tabActive" },
  { value: "suspended", labelKey: "households.tabSuspended" },
]

export function AdminHouseholds() {
  const { t } = useTranslation("admin")
  const { t: tCommon } = useTranslation("common")
  const router = useRouter()
  const { households, loading, error, refetch, setSuspended } = useAdminHouseholds()

  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebouncedValue(query)
  const [status, setStatus] = React.useState<HouseholdStatusFilter>("all")
  const [sortKey, setSortKey] = React.useState<HouseholdSortKey>("createdAt")
  const [sortDir, setSortDir] = React.useState<SortDir>("desc")

  const [target, setTarget] = React.useState<AdminHousehold | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const rows = React.useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    const filtered = households.filter((o) => {
      const suspended = o.suspendedAt !== null
      if (status === "active" && suspended) return false
      if (status === "suspended" && !suspended) return false
      if (!q) return true
      return (
        o.name.toLowerCase().includes(q) ||
        o.slug.toLowerCase().includes(q) ||
        (o.ownerName ?? "").toLowerCase().includes(q)
      )
    })
    const dir = sortDir === "asc" ? 1 : -1
    return [...filtered].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir
      if (sortKey === "memberCount") return (a.memberCount - b.memberCount) * dir
      return (
        (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir
      )
    })
  }, [households, debouncedQuery, status, sortKey, sortDir])

  function toggleSort(key: HouseholdSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "name" ? "asc" : "desc")
    }
  }

  async function confirmToggle() {
    if (!target) return
    setBusy(true)
    setActionError(null)
    try {
      await setSuspended(target.id, target.suspendedAt === null)
      setTarget(null)
    } catch (err) {
      setActionError(
        err instanceof Error
          ? translateApiError(err, tCommon)
          : t("households.updateError"),
      )
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
            {t("households.countSummary", { total: households.length, shown: rows.length })}
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

      {/* Toolbar: busca + filtro de status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("households.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <div className="flex shrink-0 rounded-md border border-foreground/[0.08] p-0.5">
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

      <div className="overflow-hidden rounded-xl border border-foreground/[0.06]">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead label={t("households.colHousehold")} active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
              <TableHead>{t("households.colOwner")}</TableHead>
              <SortHead label={t("households.colMembers")} active={sortKey === "memberCount"} dir={sortDir} onClick={() => toggleSort("memberCount")} align="right" />
              <SortHead label={t("households.colCreated")} active={sortKey === "createdAt"} dir={sortDir} onClick={() => toggleSort("createdAt")} />
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
                  <TableCell className="text-foreground/70">
                    {o.ownerName ?? "—"}
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
              {households.length === 0
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

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(o) => !o && setTarget(null)}
        title={
          target?.suspendedAt
            ? t("households.confirmReactivateTitle", { name: target.name })
            : t("households.confirmSuspendTitle", { name: target?.name })
        }
        description={
          target?.suspendedAt
            ? t("households.confirmReactivateDescription")
            : t("households.confirmSuspendDescription")
        }
        confirmLabel={target?.suspendedAt ? t("households.reactivate") : t("households.suspend")}
        destructive={!target?.suspendedAt}
        loading={busy}
        error={actionError}
        onConfirm={() => void confirmToggle()}
      />
    </div>
  )
}
