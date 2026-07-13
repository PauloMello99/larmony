"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import {
  ArrowLeft,
  Ban,
  RotateCcw,
  Users,
  Crown,
  Mail,
  Loader2,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { useAdminHouseholdDetail, useSetHouseholdSuspended } from "../hooks/use-admin"
import { fmtDate } from "../lib/format"
import { ConfirmDialog } from "./confirm-dialog"

export function AdminHouseholdDetail({ id }: { id: string | undefined }) {
  const { t } = useTranslation("admin")
  const { household, loading, error } = useAdminHouseholdDetail(id)
  const setSuspended = useSetHouseholdSuspended()

  const [confirming, setConfirming] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  async function confirmToggle() {
    if (!household) return
    setBusy(true)
    setActionError(null)
    try {
      await setSuspended(household.id, household.suspendedAt === null)
      setConfirming(false)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("householdDetail.updateError"))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-foreground/30">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (error || !household) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error ?? t("householdDetail.notFound")}
        </div>
      </div>
    )
  }

  const suspended = household.suspendedAt !== null

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold text-foreground">
              {household.name}
            </h1>
            {suspended && (
              <Badge variant="destructive" className="bg-red-500/15 text-red-400">
                {t("householdDetail.suspendedBadge")}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm text-foreground/40">
            {t("householdDetail.slugCreatedAt", { slug: household.slug, date: fmtDate(household.createdAt, t) })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="default">
            <Link href={`/households/${household.slug}`}>
              <ExternalLink className="h-4 w-4" /> {t("householdDetail.manage")}
            </Link>
          </Button>
          <Button
            variant={suspended ? "outline" : "destructive"}
            onClick={() => {
              setActionError(null)
              setConfirming(true)
            }}
          >
            {suspended ? (
              <>
                <RotateCcw className="h-4 w-4" /> {t("householdDetail.reactivate")}
              </>
            ) : (
              <>
                <Ban className="h-4 w-4" /> {t("householdDetail.suspend")}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <InfoCard icon={Users} label={t("householdDetail.infoMembers")} value={String(household.memberCount)} />
        <InfoCard
          icon={Crown}
          label={t("householdDetail.infoOwner")}
          value={household.owner?.name ?? "—"}
          sub={household.owner?.email}
        />
        <InfoCard
          icon={Mail}
          label={t("householdDetail.infoPendingInvitations")}
          value={String(household.pendingInvitations.length)}
        />
      </div>

      {/* Membros */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">{t("householdDetail.membersTitle")}</h2>
        <div className="overflow-hidden rounded-xl border border-foreground/[0.06]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("householdDetail.colName")}</TableHead>
                <TableHead>{t("householdDetail.colRole")}</TableHead>
                <TableHead>{t("householdDetail.colStatus")}</TableHead>
                <TableHead>{t("householdDetail.colJoined")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {household.members.map((m) => (
                <TableRow key={m.userId}>
                  <TableCell>
                    <Link
                      href={`/admin/users/${m.userId}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {m.name}
                    </Link>
                    <span className="block text-xs text-foreground/40">{m.email}</span>
                  </TableCell>
                  <TableCell>
                    {m.role === "owner" ? (
                      <Badge className="bg-primary/15 text-primary">{t("householdDetail.roleOwner")}</Badge>
                    ) : (
                      <span className="text-foreground/60">{m.role}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {m.enabled ? (
                      <span className="text-foreground/60">{t("householdDetail.statusActive")}</span>
                    ) : (
                      <span className="text-red-400">{t("householdDetail.statusInactive")}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-foreground/50">{fmtDate(m.joinedAt, t)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Convites pendentes */}
      {household.pendingInvitations.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">{t("householdDetail.invitationsTitle")}</h2>
          <div className="overflow-hidden rounded-xl border border-foreground/[0.06]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("householdDetail.colEmail")}</TableHead>
                  <TableHead>{t("householdDetail.colRole")}</TableHead>
                  <TableHead>{t("householdDetail.colSent")}</TableHead>
                  <TableHead>{t("householdDetail.colExpires")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {household.pendingInvitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-foreground/80">{inv.email}</TableCell>
                    <TableCell className="text-foreground/60">{inv.role}</TableCell>
                    <TableCell className="text-foreground/50">{fmtDate(inv.createdAt, t)}</TableCell>
                    <TableCell className="text-foreground/50">{fmtDate(inv.expiresAt, t)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={suspended ? t("householdDetail.confirmReactivateTitle", { name: household.name }) : t("householdDetail.confirmSuspendTitle", { name: household.name })}
        description={
          suspended
            ? t("householdDetail.confirmReactivateDescription")
            : t("householdDetail.confirmSuspendDescription")
        }
        confirmLabel={suspended ? t("householdDetail.reactivate") : t("householdDetail.suspend")}
        destructive={!suspended}
        loading={busy}
        error={actionError}
        onConfirm={() => void confirmToggle()}
      />
    </div>
  )
}

function BackLink() {
  const { t } = useTranslation("admin")
  return (
    <Link
      href="/admin/households"
      className="inline-flex items-center gap-1.5 text-sm text-foreground/50 transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> {t("householdDetail.backLink")}
    </Link>
  )
}

function InfoCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-foreground/[0.07] bg-foreground/[0.03] p-4">
      <div className="flex items-center gap-1.5 text-xs text-foreground/50">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      <p className="mt-1.5 truncate text-lg font-semibold text-foreground">{value}</p>
      {sub && <p className="truncate text-xs text-foreground/40">{sub}</p>}
    </div>
  )
}
