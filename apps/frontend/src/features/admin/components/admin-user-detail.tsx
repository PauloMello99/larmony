"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { ArrowLeft, Building2, Phone, Loader2, Activity } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { useAdminAuditLogs, useAdminUserDetail } from "../hooks/use-admin"
import { fmtDate } from "../lib/format"
import { Pager } from "./pager"

/**
 * Detalhe do usuário: memberships + atividade (audit-logs por ator). Sem
 * botão de promote/demote — role de plataforma é DB-only (M15,
 * docs/super-admin-promotion.md).
 */
export function AdminUserDetail({ id }: { id: string | undefined }) {
  const { t } = useTranslation("admin")
  const { user, loading, error } = useAdminUserDetail(id)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-foreground/30">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error ?? t("userDetail.notFound")}
        </div>
      </div>
    )
  }

  const isSuper = user.platformRole === "super_admin"

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-xl font-semibold text-foreground">
            {user.name}
          </h1>
          {isSuper && (
            <Badge className="bg-primary/15 text-primary">{t("userDetail.roleSuperAdmin")}</Badge>
          )}
        </div>
        <p className="mt-0.5 text-sm text-foreground/40">
          {t("userDetail.emailSince", { email: user.email, date: fmtDate(user.createdAt, t) })}
        </p>
        {user.phone && (
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-foreground/40">
            <Phone className="h-3.5 w-3.5" /> {user.phone}
          </p>
        )}
      </div>

      {/* Memberships */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Building2 className="h-4 w-4 text-primary" />
          {t("userDetail.householdsTitle", { count: user.memberships.length })}
        </h2>
        {user.memberships.length === 0 ? (
          <p className="rounded-xl border border-foreground/[0.07] bg-foreground/[0.03] px-4 py-8 text-center text-sm text-foreground/40">
            {t("userDetail.noHouseholds")}
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-foreground/[0.06]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("userDetail.colHousehold")}</TableHead>
                  <TableHead>{t("userDetail.colRole")}</TableHead>
                  <TableHead>{t("userDetail.colStatus")}</TableHead>
                  <TableHead>{t("userDetail.colJoined")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.memberships.map((m) => (
                  <TableRow key={m.householdId}>
                    <TableCell>
                      <Link
                        href={`/admin/households/${m.householdId}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {m.householdName}
                      </Link>
                      <span className="block text-xs text-foreground/40">/{m.householdSlug}</span>
                    </TableCell>
                    <TableCell>
                      {m.role === "owner" ? (
                        <Badge className="bg-primary/15 text-primary">{t("userDetail.roleOwner")}</Badge>
                      ) : (
                        <span className="text-foreground/60">{m.role}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.enabled ? (
                        <span className="text-foreground/60">{t("userDetail.statusActive")}</span>
                      ) : (
                        <span className="text-red-400">{t("userDetail.statusInactive")}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-foreground/50">{fmtDate(m.joinedAt, t)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Atividade — audit-logs por ator (filtro já suportado pelo backend) */}
      <UserActivity userId={user.id} />
    </div>
  )
}

function UserActivity({ userId }: { userId: string }) {
  const { t } = useTranslation("admin")
  const [page, setPage] = React.useState(1)
  const { page: result, loading } = useAdminAuditLogs({ actorId: userId, page, limit: 20 })

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Activity className="h-4 w-4 text-primary" />
        {t("userDetail.activityTitle")}
      </h2>
      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-foreground/[0.02]" />
      ) : (result?.data.length ?? 0) === 0 ? (
        <p className="rounded-xl border border-foreground/[0.07] bg-foreground/[0.03] px-4 py-8 text-center text-sm text-foreground/40">
          {t("userDetail.activityEmpty")}
        </p>
      ) : (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-foreground/[0.06]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("auditLogs.colDateTime")}</TableHead>
                  <TableHead>{t("auditLogs.colAction")}</TableHead>
                  <TableHead>{t("auditLogs.colEntity")}</TableHead>
                  <TableHead>{t("auditLogs.colHousehold")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result?.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-xs text-foreground/60">
                      {fmtDate(row.createdAt, t)}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-foreground/[0.08] text-xs text-foreground/60">
                        {row.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-foreground/60">{row.entityType}</span>
                    </TableCell>
                    <TableCell>
                      {row.household ? (
                        <Link
                          href={`/admin/households/${row.household.id}`}
                          className="text-sm text-foreground/70 hover:text-primary"
                        >
                          {row.household.name}
                        </Link>
                      ) : (
                        <span className="text-xs text-foreground/30">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {result && <Pager page={result.page} pages={result.pages} onChange={setPage} />}
        </div>
      )}
    </section>
  )
}

function BackLink() {
  const { t } = useTranslation("admin")
  return (
    <Link
      href="/admin/users"
      className="inline-flex items-center gap-1.5 text-sm text-foreground/50 transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> {t("userDetail.backLink")}
    </Link>
  )
}
