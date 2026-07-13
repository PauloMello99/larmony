"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Search, Building2, Gift, Percent, ShieldCheck, Clock } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Input } from "@/shared/components/ui/input"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { useSubscription } from "@/features/subscription"
import { translateApiError } from "@/shared/lib/api-error"
import { useAdminHouseholds, useAdminBilling } from "../hooks/use-admin"
import { useDebouncedValue } from "../lib/use-debounced-value"
import { ConfirmDialog } from "./confirm-dialog"
import type { AdminHousehold } from "../types"

export function AdminBilling() {
  const { t } = useTranslation("admin")
  const { households, loading } = useAdminHouseholds()
  const [query, setQuery] = React.useState("")
  const debounced = useDebouncedValue(query)
  const [selected, setSelected] = React.useState<AdminHousehold | null>(null)

  const rows = React.useMemo(() => {
    const q = debounced.trim().toLowerCase()
    if (!q) return households.slice(0, 8)
    return households
      .filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.slug.toLowerCase().includes(q) ||
          (o.ownerName ?? "").toLowerCase().includes(q),
      )
      .slice(0, 8)
  }, [households, debounced])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {t("billing.title")}
        </h1>
        <p className="mt-0.5 text-sm text-foreground/40">
          {t("billing.subtitle")}
        </p>
      </div>

      {/* Busca de lar */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("billing.searchPlaceholder")}
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-foreground/[0.06]">
        {loading && (
          <div className="space-y-px">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse bg-foreground/[0.02]" />
            ))}
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Building2 className="h-6 w-6 text-foreground/20" />
            <p className="text-sm text-foreground/50">{t("billing.emptyNoMatch")}</p>
          </div>
        )}
        {rows.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setSelected(o)}
            className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-foreground/[0.03] ${
              selected?.id === o.id ? "bg-foreground/[0.05]" : ""
            }`}
          >
            <div>
              <span className="font-medium text-foreground">{o.name}</span>
              <span className="ml-2 text-xs text-foreground/40">/{o.slug}</span>
            </div>
            <span className="text-sm text-foreground/50">{o.ownerName ?? "—"}</span>
          </button>
        ))}
      </div>

      {selected && (
        <HouseholdBillingPanel
          key={selected.id}
          householdId={selected.id}
          householdName={selected.name}
        />
      )}
    </div>
  )
}

function HouseholdBillingPanel({
  householdId,
  householdName,
}: {
  householdId: string
  householdName: string
}) {
  const { t } = useTranslation("admin")
  const { subscription, loading, error } = useSubscription(householdId)

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-foreground/[0.02]" />
  }
  if (error || !subscription) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
        {error ?? t("billing.loadError")}
      </div>
    )
  }

  const isComp = subscription.type === "custom"
  const isTrial = subscription.type === "trial"
  const isFree = subscription.type === "free"
  const hasStripeSub = !!subscription.stripeSubscriptionId
  const hasDiscount = !!subscription.stripeCouponId

  return (
    <div className="space-y-5 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">{householdName}</h2>
        <Badge className="bg-foreground/[0.08] text-foreground/60">
          {subscription.entitlements.plan}
        </Badge>
        <Badge className="bg-foreground/[0.08] text-foreground/60">
          {subscription.status}
        </Badge>
        {hasDiscount && subscription.discountPercent != null && (
          <Badge className="bg-emerald-400/10 text-emerald-400">
            -{subscription.discountPercent}%
          </Badge>
        )}
      </div>

      <CompPanel householdId={householdId} isComp={isComp} reason={subscription.compReason} />

      <div className="border-t border-foreground/[0.06]" />

      <TrialPanel
        householdId={householdId}
        isTrial={isTrial}
        isFree={isFree}
        trialEndsAt={subscription.trialEndsAt}
      />

      <div className="border-t border-foreground/[0.06]" />

      <DiscountPanel
        householdId={householdId}
        hasStripeSub={hasStripeSub}
        hasDiscount={hasDiscount}
      />
    </div>
  )
}

function TrialPanel({
  householdId,
  isTrial,
  isFree,
  trialEndsAt,
}: {
  householdId: string
  isTrial: boolean
  isFree: boolean
  trialEndsAt: string | null
}) {
  const { t } = useTranslation("admin")
  const { t: tCommon } = useTranslation("common")
  const { grantTrial, revokeTrial } = useAdminBilling()
  const [months, setMonths] = React.useState("")
  const [confirmRevoke, setConfirmRevoke] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  async function grant() {
    const n = Number(months)
    if (!Number.isInteger(n) || n < 1 || n > 24) {
      setErr(t("billing.trialMonthsError"))
      return
    }
    setErr(null)
    try {
      await grantTrial.mutateAsync({ householdId, months: n })
      setMonths("")
    } catch (e) {
      setErr(
        e instanceof Error
          ? translateApiError(e, tCommon)
          : t("billing.grantTrialError"),
      )
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-orange-400" />
        <h3 className="text-sm font-medium text-foreground">{t("billing.trialTitle")}</h3>
      </div>

      {isTrial ? (
        <div className="mt-3">
          <p className="text-sm text-foreground/70">
            {trialEndsAt
              ? t("billing.trialActiveUntil", {
                  date: new Date(trialEndsAt).toLocaleDateString(t("format.dateLocale")),
                })
              : t("billing.trialActive")}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setConfirmRevoke(true)}
          >
            {t("billing.revokeTrial")}
          </Button>
        </div>
      ) : !isFree ? (
        <p className="mt-3 text-sm text-foreground/40">
          {t("billing.trialOnlyFree")}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs text-foreground/50">{t("billing.trialDurationLabel")}</label>
            <Input
              type="number"
              min={1}
              max={24}
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              className="mt-1"
            />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button size="sm" onClick={() => void grant()} disabled={grantTrial.isPending}>
            {grantTrial.isPending ? t("billing.granting") : t("billing.grantTrial")}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmRevoke}
        onOpenChange={setConfirmRevoke}
        title={t("billing.confirmRevokeTrialTitle")}
        description={t("billing.confirmRevokeTrialDescription")}
        confirmLabel={t("billing.revoke")}
        destructive
        loading={revokeTrial.isPending}
        error={
          revokeTrial.error instanceof Error
            ? translateApiError(revokeTrial.error, tCommon)
            : null
        }
        onConfirm={() =>
          revokeTrial.mutate(
            { householdId },
            { onSuccess: () => setConfirmRevoke(false) },
          )
        }
      />
    </div>
  )
}

function CompPanel({
  householdId,
  isComp,
  reason,
}: {
  householdId: string
  isComp: boolean
  reason: string | null
}) {
  const { t } = useTranslation("admin")
  const { t: tCommon } = useTranslation("common")
  const { grantComp, revokeComp } = useAdminBilling()
  const [newReason, setNewReason] = React.useState("")
  const [expiresAt, setExpiresAt] = React.useState<string>("")
  const [confirmRevoke, setConfirmRevoke] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  async function grant() {
    if (!newReason.trim()) {
      setErr(t("billing.compReasonRequired"))
      return
    }
    setErr(null)
    try {
      await grantComp.mutateAsync({
        householdId,
        reason: newReason.trim(),
        expiresAt: expiresAt || undefined,
      })
      setNewReason("")
      setExpiresAt("")
    } catch (e) {
      setErr(
        e instanceof Error
          ? translateApiError(e, tCommon)
          : t("billing.grantCompError"),
      )
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-orange-400" />
        <h3 className="text-sm font-medium text-foreground">{t("billing.compTitle")}</h3>
      </div>

      {isComp ? (
        <div className="mt-3">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm text-foreground/70">{t("billing.compActive")}</p>
              {reason && (
                <p className="mt-0.5 text-sm text-foreground/40">{t("billing.compReason", { reason })}</p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setConfirmRevoke(true)}
          >
            {t("billing.revokeComp")}
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs text-foreground/50">{t("billing.compReasonLabel")}</label>
            <Input
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder={t("billing.compReasonPlaceholder")}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-foreground/50">{t("billing.compExpiresLabel")}</label>
            <div className="mt-1">
              {/* Validade é uma data futura — o default do DatePicker é passado. */}
              <DatePicker
                value={expiresAt}
                onChange={setExpiresAt}
                startMonth={new Date()}
                endMonth={new Date(2100, 0)}
                placeholder={t("billing.compExpiresPlaceholder")}
              />
            </div>
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button size="sm" onClick={() => void grant()} disabled={grantComp.isPending}>
            {grantComp.isPending ? t("billing.granting") : t("billing.grantComp")}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmRevoke}
        onOpenChange={setConfirmRevoke}
        title={t("billing.confirmRevokeCompTitle")}
        description={t("billing.confirmRevokeCompDescription")}
        confirmLabel={t("billing.revoke")}
        destructive
        loading={revokeComp.isPending}
        error={
          revokeComp.error instanceof Error
            ? translateApiError(revokeComp.error, tCommon)
            : null
        }
        onConfirm={() =>
          revokeComp.mutate(
            { householdId },
            { onSuccess: () => setConfirmRevoke(false) },
          )
        }
      />
    </div>
  )
}

type DiscountMode = "percent" | "amount"
type Duration = "once" | "repeating" | "forever"

function DiscountPanel({
  householdId,
  hasStripeSub,
  hasDiscount,
}: {
  householdId: string
  hasStripeSub: boolean
  hasDiscount: boolean
}) {
  const { t } = useTranslation("admin")
  const { t: tCommon } = useTranslation("common")
  const { applyDiscount, removeDiscount } = useAdminBilling()
  const [mode, setMode] = React.useState<DiscountMode>("percent")
  const [percent, setPercent] = React.useState("")
  const [amountReais, setAmountReais] = React.useState("")
  const [duration, setDuration] = React.useState<Duration>("once")
  const [months, setMonths] = React.useState("")
  const [err, setErr] = React.useState<string | null>(null)

  async function apply() {
    setErr(null)
    try {
      await applyDiscount.mutateAsync({
        householdId,
        percent: mode === "percent" ? Number(percent) : undefined,
        amountCents:
          mode === "amount" ? Math.round(Number(amountReais) * 100) : undefined,
        duration,
        durationInMonths: duration === "repeating" ? Number(months) : undefined,
      })
      setPercent("")
      setAmountReais("")
      setMonths("")
    } catch (e) {
      setErr(
        e instanceof Error
          ? translateApiError(e, tCommon)
          : t("billing.applyDiscountError"),
      )
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Percent className="h-4 w-4 text-orange-400" />
        <h3 className="text-sm font-medium text-foreground">{t("billing.discountTitle")}</h3>
      </div>

      {hasDiscount ? (
        <div className="mt-3">
          <p className="text-sm text-foreground/70">{t("billing.discountActive")}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => removeDiscount.mutate({ householdId })}
            disabled={removeDiscount.isPending}
          >
            {removeDiscount.isPending ? t("billing.removing") : t("billing.removeDiscount")}
          </Button>
        </div>
      ) : !hasStripeSub ? (
        <p className="mt-3 text-sm text-foreground/40">
          {t("billing.discountRequiresStripe")}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <Toggle
            options={[
              { value: "percent", label: t("billing.modePercent") },
              { value: "amount", label: t("billing.modeAmount") },
            ]}
            value={mode}
            onChange={(v) => setMode(v as DiscountMode)}
          />
          {mode === "percent" ? (
            <div>
              <label className="text-xs text-foreground/50">{t("billing.percentLabel")}</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                className="mt-1"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs text-foreground/50">{t("billing.amountLabel")}</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={amountReais}
                onChange={(e) => setAmountReais(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-foreground/50">{t("billing.durationLabel")}</label>
            <div className="mt-1">
              <Toggle
                options={[
                  { value: "once", label: t("billing.durationOnce") },
                  { value: "repeating", label: t("billing.durationRepeating") },
                  { value: "forever", label: t("billing.durationForever") },
                ]}
                value={duration}
                onChange={(v) => setDuration(v as Duration)}
              />
            </div>
          </div>
          {duration === "repeating" && (
            <div>
              <label className="text-xs text-foreground/50">{t("billing.monthsLabel")}</label>
              <Input
                type="number"
                min={1}
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button size="sm" onClick={() => void apply()} disabled={applyDiscount.isPending}>
            {applyDiscount.isPending ? t("billing.applying") : t("billing.applyDiscount")}
          </Button>
        </div>
      )}
    </div>
  )
}

function Toggle({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex rounded-md border border-foreground/[0.08] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded px-3 py-1.5 text-sm transition-colors ${
            value === o.value
              ? "bg-foreground/[0.08] text-foreground"
              : "text-foreground/50 hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
