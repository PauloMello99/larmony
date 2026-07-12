"use client"

import { useRouter } from "next/router"
import { useTranslation } from "react-i18next"
import { CreditCard, CheckCircle2, Sparkles, ShieldCheck } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { cn } from "@/shared/lib/utils"
import { useCurrentHousehold } from "@/features/dashboard/components/household-context"
import { useSubscription } from "../hooks/use-subscription"
import { useSubscriptionMutations } from "../hooks/use-subscription-mutations"

export function SubscriptionPage() {
  const { t } = useTranslation("subscription")
  const router = useRouter()
  const { householdId, household } = useCurrentHousehold()
  const isOwner = household.role === "owner"

  const { subscription, entitlements, loading, error } = useSubscription(householdId)
  const {
    startCheckout,
    checkoutPending,
    checkoutError,
    openPortal,
    portalPending,
    portalError,
  } = useSubscriptionMutations(householdId)

  const checkoutResult = router.query.checkout // "success" | "cancel" | undefined

  return (
    <div className="grid gap-8">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="mt-0.5 text-sm text-foreground/50">{t("description")}</p>
      </div>

      {checkoutResult === "success" && (
        <Banner tone="success">{t("banner.success")}</Banner>
      )}
      {checkoutResult === "cancel" && (
        <Banner tone="neutral">{t("banner.cancel")}</Banner>
      )}

      {loading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : error || !entitlements ? (
        <Banner tone="error">{error ?? t("loadError")}</Banner>
      ) : (
        <section className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-5">
          <div className="flex flex-wrap items-center gap-2">
            <CreditCard className="h-4 w-4 text-orange-400" />
            <h3 className="text-sm font-medium">{t("planTitle")}</h3>
            <PlanBadge plan={entitlements.plan} />
            <StatusBadge status={entitlements.status} />
          </div>

          {entitlements.plan === "free" && (
            <FreePanel
              t={t}
              isOwner={isOwner}
              pending={checkoutPending}
              error={checkoutError}
              onCheckout={() => startCheckout()}
            />
          )}

          {entitlements.plan === "premium" && (
            <PremiumPanel
              t={t}
              isOwner={isOwner}
              pastDue={entitlements.status === "past_due"}
              pending={portalPending}
              error={portalError}
              onPortal={() => openPortal()}
            />
          )}

          {entitlements.plan === "custom" && (
            <CompPanel t={t} reason={subscription?.compReason ?? null} />
          )}
        </section>
      )}
    </div>
  )
}

function FreePanel({
  t,
  isOwner,
  pending,
  error,
  onCheckout,
}: {
  t: (k: string) => string
  isOwner: boolean
  pending: boolean
  error: string | null
  onCheckout: () => void
}) {
  return (
    <div className="mt-4">
      <p className="text-sm text-foreground/60">{t("free.description")}</p>
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-foreground/[0.03] p-4">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
        <div>
          <p className="text-sm font-medium">{t("premiumOffer.title")}</p>
          <p className="mt-0.5 text-sm text-foreground/50">
            {t("premiumOffer.description")}
          </p>
        </div>
      </div>
      {isOwner ? (
        <>
          <Button className="mt-4" onClick={onCheckout} disabled={pending}>
            {pending ? t("free.ctaPending") : t("free.cta")}
          </Button>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </>
      ) : (
        <p className="mt-4 text-sm text-foreground/40">{t("ownerOnly")}</p>
      )}
    </div>
  )
}

function PremiumPanel({
  t,
  isOwner,
  pastDue,
  pending,
  error,
  onPortal,
}: {
  t: (k: string) => string
  isOwner: boolean
  pastDue: boolean
  pending: boolean
  error: string | null
  onPortal: () => void
}) {
  return (
    <div className="mt-4">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <p className="text-sm text-foreground/60">{t("premium.description")}</p>
      </div>
      {pastDue && (
        <div className="mt-3">
          <Banner tone="neutral">{t("premium.pastDue")}</Banner>
        </div>
      )}
      {isOwner ? (
        <>
          <Button
            variant="outline"
            className="mt-4"
            onClick={onPortal}
            disabled={pending}
          >
            {pending ? t("premium.portalPending") : t("premium.portalCta")}
          </Button>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </>
      ) : (
        <p className="mt-4 text-sm text-foreground/40">{t("ownerOnly")}</p>
      )}
    </div>
  )
}

function CompPanel({
  t,
  reason,
}: {
  t: (k: string) => string
  reason: string | null
}) {
  return (
    <div className="mt-4">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <div>
          <p className="text-sm font-medium">{t("comp.title")}</p>
          <p className="mt-0.5 text-sm text-foreground/50">{t("comp.description")}</p>
          {reason && (
            <p className="mt-2 text-sm text-foreground/40">
              {t("comp.reasonLabel")}: {reason}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function PlanBadge({ plan }: { plan: "free" | "premium" | "custom" }) {
  const { t } = useTranslation("subscription")
  const tone =
    plan === "free"
      ? "bg-foreground/[0.06] text-foreground/50"
      : "bg-orange-400/10 text-orange-400"
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        tone,
      )}
    >
      {t(`plan.${plan}`)}
    </span>
  )
}

function StatusBadge({
  status,
}: {
  status: "active" | "trialing" | "past_due" | "canceled"
}) {
  const { t } = useTranslation("subscription")
  const tone =
    status === "active" || status === "trialing"
      ? "bg-emerald-400/10 text-emerald-400"
      : status === "past_due"
        ? "bg-amber-400/10 text-amber-400"
        : "bg-foreground/[0.06] text-foreground/40"
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        tone,
      )}
    >
      {t(`status.${status}`)}
    </span>
  )
}

function Banner({
  tone,
  children,
}: {
  tone: "success" | "neutral" | "error"
  children: React.ReactNode
}) {
  const styles = {
    success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
    neutral: "border-foreground/10 bg-foreground/[0.03] text-foreground/60",
    error: "border-destructive/20 bg-destructive/10 text-destructive",
  }[tone]
  return (
    <div className={cn("rounded-lg border p-4 text-sm", styles)}>{children}</div>
  )
}
