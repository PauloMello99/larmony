"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { useTranslation } from "react-i18next"
import { RefreshCw, Search, Users } from "lucide-react"
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
import { useAdminUsers } from "../hooks/use-admin"
import { fmtDate } from "../lib/format"
import { useDebouncedValue } from "../lib/use-debounced-value"
import { SortHead } from "./sort-head"
import { Pager } from "./pager"
import type { AdminUserFilters } from "../types"

type RoleTab = "all" | "super_admin" | "user"
type SortKey = NonNullable<AdminUserFilters["sortBy"]>

const ROLE_TABS: { value: RoleTab; labelKey: string }[] = [
  { value: "all", labelKey: "users.tabAll" },
  { value: "super_admin", labelKey: "users.tabSuperAdmins" },
  { value: "user", labelKey: "users.tabUsers" },
]

/**
 * Lista de usuários da plataforma (server-side). Sem ações de role — promote/
 * demote de super_admin é operação DB-only (docs/super-admin-promotion.md).
 */
export function AdminUsers() {
  const { t } = useTranslation("admin")
  const router = useRouter()

  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebouncedValue(query)
  const [role, setRole] = React.useState<RoleTab>("all")
  const [sortBy, setSortBy] = React.useState<SortKey>("createdAt")
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc")
  const [pageNum, setPageNum] = React.useState(1)

  React.useEffect(() => {
    setPageNum(1)
  }, [debouncedQuery, role])

  const { page, loading, error, refetch } = useAdminUsers({
    page: pageNum,
    limit: 20,
    q: debouncedQuery.trim() || undefined,
    platformRole: role === "all" ? undefined : role,
    sortBy,
    sortDir,
  })
  const rows = page?.data ?? []

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(key)
      setSortDir(key === "name" ? "asc" : "desc")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t("users.title")}</h1>
          <p className="mt-0.5 text-sm text-foreground/40">
            {t("users.countSummary", { total: page?.total ?? 0, shown: rows.length })}
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
              <SortHead label={t("users.colUser")} active={sortBy === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
              <TableHead>{t("users.colRole")}</TableHead>
              <SortHead label={t("users.colHouseholds")} active={sortBy === "householdCount"} dir={sortDir} onClick={() => toggleSort("householdCount")} />
              <SortHead label={t("users.colCreated")} active={sortBy === "createdAt"} dir={sortDir} onClick={() => toggleSort("createdAt")} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => (
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
                  {u.platformRole === "super_admin" ? (
                    <Badge className="bg-primary/15 text-primary">
                      {t("users.roleSuperAdmin")}
                    </Badge>
                  ) : (
                    <span className="text-foreground/50">{t("users.roleUser")}</span>
                  )}
                </TableCell>
                <TableCell>
                  {u.households.length === 0 ? (
                    <span className="text-foreground/30">—</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {u.households.slice(0, 3).map((h) => (
                        <Link
                          key={h.id}
                          href={`/admin/households/${h.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`rounded-full px-2 py-0.5 text-xs transition-colors hover:bg-foreground/[0.1] ${
                            h.role === "owner"
                              ? "bg-primary/10 text-primary"
                              : "bg-foreground/[0.06] text-foreground/60"
                          }`}
                        >
                          {h.name}
                        </Link>
                      ))}
                      {u.households.length > 3 && (
                        <span className="px-1 text-xs text-foreground/40">
                          +{u.households.length - 3}
                        </span>
                      )}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-foreground/50">
                  {fmtDate(u.createdAt, t)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Users className="h-6 w-6 text-foreground/20" />
            <p className="text-sm text-foreground/50">
              {(page?.total ?? 0) === 0 && !debouncedQuery && role === "all"
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

      {page && <Pager page={page.page} pages={page.pages} onChange={setPageNum} />}
    </div>
  )
}
