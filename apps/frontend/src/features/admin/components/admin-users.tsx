"use client"

import * as React from "react"
import { useRouter } from "next/router"
import { useTranslation } from "react-i18next"
import { RefreshCw, ShieldCheck, ShieldOff, Search, Users } from "lucide-react"
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
import { useMe } from "@/features/auth/hooks/use-me"
import { translateApiError } from "@/shared/lib/api-error"
import { useAdminUsers } from "../hooks/use-admin"
import { fmtDate } from "../lib/format"
import { useDebouncedValue } from "../lib/use-debounced-value"
import { ConfirmDialog } from "./confirm-dialog"
import { SortHead } from "./sort-head"
import type { AdminUser, SortDir, UserRoleFilter, UserSortKey } from "../types"

const ROLE_TABS: { value: UserRoleFilter; labelKey: string }[] = [
  { value: "all", labelKey: "users.tabAll" },
  { value: "super_admin", labelKey: "users.tabSuperAdmins" },
  { value: "user", labelKey: "users.tabUsers" },
]

export function AdminUsers() {
  const { t } = useTranslation("admin")
  const { t: tCommon } = useTranslation("common")
  const router = useRouter()
  const { me } = useMe()
  const { users, loading, error, refetch, setPlatformRole } = useAdminUsers()

  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebouncedValue(query)
  const [role, setRole] = React.useState<UserRoleFilter>("all")
  const [sortKey, setSortKey] = React.useState<UserSortKey>("createdAt")
  const [sortDir, setSortDir] = React.useState<SortDir>("desc")

  const [target, setTarget] = React.useState<AdminUser | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const rows = React.useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    const filtered = users.filter((u) => {
      if (role !== "all" && u.platformRole !== role) return false
      if (!q) return true
      return (
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      )
    })
    const dir = sortDir === "asc" ? 1 : -1
    return [...filtered].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir
      if (sortKey === "householdCount") return (a.householdCount - b.householdCount) * dir
      return (
        (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir
      )
    })
  }, [users, debouncedQuery, role, sortKey, sortDir])

  function toggleSort(key: UserSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "name" ? "asc" : "desc")
    }
  }

  async function confirmToggle() {
    if (!target) return
    const next = target.platformRole === "super_admin" ? "user" : "super_admin"
    setBusy(true)
    setActionError(null)
    try {
      await setPlatformRole(target.id, next)
      setTarget(null)
    } catch (err) {
      setActionError(
        err instanceof Error
          ? translateApiError(err, tCommon)
          : t("users.updateError"),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t("users.title")}</h1>
          <p className="mt-0.5 text-sm text-foreground/40">
            {t("users.countSummary", { total: users.length, shown: rows.length })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void refetch()}
          disabled={loading}
          title={t("users.refresh")}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("users.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <div className="flex shrink-0 rounded-md border border-foreground/[0.08] p-0.5">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setRole(tab.value)}
              className={`rounded px-3 py-1.5 text-sm transition-colors ${
                role === tab.value
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
              <SortHead label={t("users.colUser")} active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
              <TableHead>{t("users.colRole")}</TableHead>
              <SortHead label={t("users.colHouseholds")} active={sortKey === "householdCount"} dir={sortDir} onClick={() => toggleSort("householdCount")} align="right" />
              <SortHead label={t("users.colCreated")} active={sortKey === "createdAt"} dir={sortDir} onClick={() => toggleSort("createdAt")} />
              <TableHead className="text-right">{t("users.colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => {
              const isSuper = u.platformRole === "super_admin"
              const isSelf = me?.id === u.id
              return (
                <TableRow
                  key={u.id}
                  onClick={() => void router.push(`/admin/users/${u.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <div className="font-medium text-foreground">{u.name}</div>
                    <span className="text-xs text-foreground/40">{u.email}</span>
                  </TableCell>
                  <TableCell>
                    {isSuper ? (
                      <Badge className="bg-primary/15 text-primary">
                        {t("users.roleSuperAdmin")}
                      </Badge>
                    ) : (
                      <span className="text-foreground/50">{t("users.roleUser")}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-foreground/70">
                    {u.householdCount}
                  </TableCell>
                  <TableCell className="text-foreground/50">
                    {fmtDate(u.createdAt, t)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isSelf}
                      title={isSelf ? t("users.selfRoleTitle") : undefined}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActionError(null)
                        setTarget(u)
                      }}
                      className={isSuper ? "text-foreground/60" : "text-primary hover:text-orange-300"}
                    >
                      {isSuper ? (
                        <>
                          <ShieldOff className="h-4 w-4" />
                          <span className="hidden sm:inline">{t("users.demote")}</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4" />
                          <span className="hidden sm:inline">{t("users.promote")}</span>
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
            <Users className="h-6 w-6 text-foreground/20" />
            <p className="text-sm text-foreground/50">
              {users.length === 0
                ? t("users.emptyNone")
                : t("users.emptyNoMatch")}
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
          target?.platformRole === "super_admin"
            ? t("users.confirmDemoteTitle", { name: target.name })
            : t("users.confirmPromoteTitle", { name: target?.name })
        }
        description={
          target?.platformRole === "super_admin"
            ? t("users.confirmDemoteDescription")
            : t("users.confirmPromoteDescription")
        }
        confirmLabel={target?.platformRole === "super_admin" ? t("users.demote") : t("users.promote")}
        destructive={target?.platformRole === "super_admin"}
        loading={busy}
        error={actionError}
        onConfirm={() => void confirmToggle()}
      />
    </div>
  )
}
