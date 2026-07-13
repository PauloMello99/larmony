"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import {
  ArrowLeft,
  ShieldCheck,
  ShieldOff,
  Building2,
  Phone,
  Loader2,
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
import { useMe } from "@/features/auth/hooks/use-me"
import { translateApiError } from "@/shared/lib/api-error"
import { useAdminUserDetail, useSetUserPlatformRole } from "../hooks/use-admin"
import { fmtDate } from "../lib/format"
import { ConfirmDialog } from "./confirm-dialog"

export function AdminUserDetail({ id }: { id: string | undefined }) {
  const { t } = useTranslation("admin")
  const { t: tCommon } = useTranslation("common")
  const { me } = useMe()
  const { user, loading, error } = useAdminUserDetail(id)
  const setPlatformRole = useSetUserPlatformRole()

  const [confirming, setConfirming] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  async function confirmToggle() {
    if (!user) return
    const next = user.platformRole === "super_admin" ? "user" : "super_admin"
    setBusy(true)
    setActionError(null)
    try {
      await setPlatformRole(user.id, next)
      setConfirming(false)
    } catch (err) {
      setActionError(
        err instanceof Error
          ? translateApiError(err, tCommon)
          : t("userDetail.updateError"),
      )
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
  const isSelf = me?.id === user.id

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
        <Button
          variant={isSuper ? "outline" : "default"}
          disabled={isSelf}
          title={isSelf ? t("userDetail.selfRoleTitle") : undefined}
          onClick={() => {
            setActionError(null)
            setConfirming(true)
          }}
          className="shrink-0"
        >
          {isSuper ? (
            <>
              <ShieldOff className="h-4 w-4" /> {t("userDetail.demote")}
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" /> {t("userDetail.promoteLong")}
            </>
          )}
        </Button>
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

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={
          isSuper
            ? t("userDetail.confirmDemoteTitle", { name: user.name })
            : t("userDetail.confirmPromoteTitle", { name: user.name })
        }
        description={
          isSuper
            ? t("userDetail.confirmDemoteDescription")
            : t("userDetail.confirmPromoteDescription")
        }
        confirmLabel={isSuper ? t("userDetail.confirmDemote") : t("userDetail.confirmPromote")}
        destructive={isSuper}
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
      href="/admin/users"
      className="inline-flex items-center gap-1.5 text-sm text-foreground/50 transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> {t("userDetail.backLink")}
    </Link>
  )
}
