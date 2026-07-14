"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Gift, Percent, ShieldCheck, ExternalLink, Receipt } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Input } from "@/shared/components/ui/input"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { useSubscription } from "@/features/subscription"
import { formatCentsToBRL } from "@/shared/lib/currency"
import { translateApiError } from "@/shared/lib/api-error"
import { useAdminBilling, useAdminInvoices } from "../hooks/use-admin"
import { ConfirmDialog } from "./confirm-dialog"

/**
 * Painel de gestão da assinatura de UM lar (comp/desconto/faturas, M16 PR4).
 * Extraído da antiga página /admin/billing (M15): agora vive na aba
 * Assinatura do detalhe do lar — o lar já está selecionado pelo contexto.
 * Trial administrativo local foi removido no M16 (trial hoje é self-serve
 * via Stripe, ver `features/subscription`); "dar acesso grátis" continua
 * possível via comp (isenção).
 */
export function AdminSubscriptionPanel({
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
        {subscription.tier && (
          <Badge className="bg-foreground/[0.08] text-foreground/60">
            {t(`billing.tier.${subscription.tier}`)}
          </Badge>
        )}
        {hasDiscount && subscription.discountPercent != null && (
          <Badge className="bg-emerald-400/10 text-emerald-400">
            -{subscription.discountPercent}%
          </Badge>
        )}
        {/* Deep-links: detalhe fino (faturas, payments, refund manual) fica no Stripe. */}
        <div className="ml-auto flex items-center gap-3">
          {subscription.stripeSubscriptionId && (
            <a
              href={`https://dashboard.stripe.com/subscriptions/${subscription.stripeSubscriptionId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              {t("billing.openSubscriptionInStripe")}
            </a>
          )}
          {subscription.stripeCustomerId && (
            <a
              href={`https://dashboard.stripe.com/customers/${subscription.stripeCustomerId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              {t("billing.openInStripe")}
            </a>
          )}
        </div>
      </div>

      <CompPanel householdId={householdId} isComp={isComp} reason={subscription.compReason} />

      <div className="border-t border-foreground/[0.06]" />

      <DiscountPanel
        householdId={householdId}
        hasStripeSub={hasStripeSub}
        hasDiscount={hasDiscount}
      />

      <div className="border-t border-foreground/[0.06]" />

      <InvoicesPanel householdId={householdId} />
    </div>
  )
}

function InvoicesPanel({ householdId }: { householdId: string }) {
  const { t } = useTranslation("admin")
  const { invoices, loading, error } = useAdminInvoices(householdId)

  return (
    <div>
      <div className="flex items-center gap-2">
        <Receipt className="h-4 w-4 text-orange-400" />
        <h3 className="text-sm font-medium text-foreground">{t("billing.invoicesTitle")}</h3>
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-20 w-full rounded-lg" />
      ) : error ? (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      ) : invoices.length === 0 ? (
        <p className="mt-3 text-sm text-foreground/40">{t("billing.invoicesEmpty")}</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {invoices.map((invoice) => (
            <li
              key={invoice.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-foreground/[0.06] px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-foreground/70">
                  {invoice.number ?? invoice.id}
                </span>
                <span className="text-xs text-foreground/40">
                  {new Date(invoice.createdAt).toLocaleDateString(t("format.dateLocale"))}
                </span>
                <Badge className="bg-foreground/[0.08] text-[10px] text-foreground/50">
                  {invoice.status}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground/80">
                  {formatCentsToBRL(invoice.amountCents)}
                </span>
                {invoice.hostedInvoiceUrl && (
                  <a
                    href={invoice.hostedInvoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t("billing.viewInvoice")}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
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
