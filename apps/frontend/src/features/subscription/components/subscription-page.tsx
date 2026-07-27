"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { Trans, useTranslation } from "react-i18next"
import { CreditCard, CheckCircle2, Sparkles, ShieldCheck, Lock } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { cn } from "@/shared/lib/utils"
import { formatCentsToBRL } from "@/shared/lib/currency"
import { useCurrentHousehold } from "@/features/dashboard/components/household-context"
import { useSubscription } from "../hooks/use-subscription"
import { useSubscriptionMutations } from "../hooks/use-subscription-mutations"
import { planFor } from "../lib/plan-catalog"
import type { ResolvedPlan } from "../types"

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
  const isOnboarding = router.query.onboarding === "1"

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
      {isOnboarding && entitlements?.plan === "locked" && (
        <Banner tone="neutral">{t("locked.onboardingNotice")}</Banner>
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

          {entitlements.plan === "locked" && (
            <LockedPanel
              t={t}
              isOwner={isOwner}
              pending={checkoutPending}
              error={checkoutError}
              onCheckout={(planKey) => startCheckout(planKey)}
            />
          )}

          {/* Trial self-serve (M16): dá acesso Completo por 30 dias (plan
              resolve sempre "completo" durante o trial); o CTA leva ao
              checkout do plano que a pessoa realmente quer pagar depois. */}
          {entitlements.plan !== "locked" && entitlements.source === "trial" && (
            <TrialPanel
              t={t}
              isOwner={isOwner}
              pending={checkoutPending}
              error={checkoutError}
              onCheckout={(planKey) => startCheckout(planKey)}
            />
          )}

          {entitlements.plan !== "locked" && entitlements.source === "stripe" && (
            <ActivePanel
              t={t}
              isOwner={isOwner}
              pastDue={entitlements.status === "past_due"}
              pending={portalPending}
              error={portalError}
              onPortal={() => openPortal()}
            />
          )}

          {entitlements.source === "comp" && (
            <CompPanel t={t} reason={subscription?.compReason ?? null} />
          )}
        </section>
      )}
    </div>
  )
}

function PlanPicker({
  t,
  pending,
  onCheckout,
}: {
  t: (k: string, o?: Record<string, unknown>) => string
  pending: boolean
  onCheckout: (planKey: string) => void
}) {
  const { t: tNs } = useTranslation("subscription")
  const [interval, setInterval] = React.useState<"month" | "year">("month")
  const essencial = planFor("essencial", interval)
  const completo = planFor("completo", interval)

  return (
    <div className="mt-4">
      <div className="mb-4 inline-flex rounded-lg border border-foreground/10 p-0.5">
        <button
          type="button"
          onClick={() => setInterval("month")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            interval === "month" ? "bg-foreground/10 text-foreground" : "text-foreground/50",
          )}
        >
          {t("locked.intervalMonthly")}
        </button>
        <button
          type="button"
          onClick={() => setInterval("year")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            interval === "year" ? "bg-foreground/10 text-foreground" : "text-foreground/50",
          )}
        >
          {t("locked.intervalAnnual")}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PlanCard
          title={t("plan.essencial")}
          description={t("locked.descriptionEssencial")}
          priceCents={essencial.amountCents}
          pending={pending}
          onSelect={() => onCheckout(essencial.key)}
        />
        <PlanCard
          title={t("plan.completo")}
          description={t("locked.descriptionCompleto")}
          priceCents={completo.amountCents}
          highlighted
          pending={pending}
          onSelect={() => onCheckout(completo.key)}
        />
      </div>

      <div className="mt-4 text-center text-[11px] leading-relaxed text-foreground/35">
        <p>{t("locked.disclosure.renewal")}</p>
        <p className="mt-1">
          <Trans
            t={tNs}
            i18nKey="locked.disclosure.terms"
            components={{
              terms: (
                <Link
                  href="/legal/termos-de-uso"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground/60"
                />
              ),
              privacy: (
                <Link
                  href="/legal/privacidade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground/60"
                />
              ),
            }}
          />
        </p>
      </div>
    </div>
  )
}

function PlanCard({
  title,
  description,
  priceCents,
  highlighted,
  pending,
  onSelect,
}: {
  title: string
  description: string
  priceCents: number
  highlighted?: boolean
  pending: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation("subscription")
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        highlighted
          ? "border-primary/30 bg-primary/[0.04]"
          : "border-foreground/[0.08] bg-foreground/[0.02]",
      )}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-lg font-semibold">{formatCentsToBRL(priceCents)}</p>
      <p className="mt-1 text-xs text-foreground/50">{description}</p>
      <Button
        className="mt-3 w-full"
        variant={highlighted ? "default" : "outline"}
        onClick={onSelect}
        disabled={pending}
      >
        {pending ? t("locked.ctaPending") : t("locked.cta")}
      </Button>
    </div>
  )
}

function LockedPanel({
  t,
  isOwner,
  pending,
  error,
  onCheckout,
}: {
  t: (k: string, o?: Record<string, unknown>) => string
  isOwner: boolean
  pending: boolean
  error: string | null
  onCheckout: (planKey: string) => void
}) {
  return (
    <div className="mt-4">
      <p className="text-sm text-foreground/60">{t("locked.description")}</p>
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-foreground/[0.03] p-4">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
        <p className="text-sm text-foreground/50">{t("locked.trialNotice")}</p>
      </div>
      {isOwner ? (
        <>
          <PlanPicker t={t} pending={pending} onCheckout={onCheckout} />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </>
      ) : (
        <p className="mt-4 text-sm text-foreground/40">{t("ownerOnly")}</p>
      )}
    </div>
  )
}

function ActivePanel({
  t,
  isOwner,
  pastDue,
  pending,
  error,
  onPortal,
}: {
  t: (k: string, o?: Record<string, unknown>) => string
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
        <p className="text-sm text-foreground/60">{t("active.description")}</p>
      </div>
      {pastDue && (
        <div className="mt-3">
          <Banner tone="neutral">{t("active.pastDue")}</Banner>
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
            {pending ? t("active.portalPending") : t("active.portalCta")}
          </Button>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </>
      ) : (
        <p className="mt-4 text-sm text-foreground/40">{t("ownerOnly")}</p>
      )}
    </div>
  )
}

function TrialPanel({
  t,
  isOwner,
  pending,
  error,
  onCheckout,
}: {
  t: (k: string, o?: Record<string, unknown>) => string
  isOwner: boolean
  pending: boolean
  error: string | null
  onCheckout: (planKey: string) => void
}) {
  return (
    <div className="mt-4">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
        <div>
          <p className="text-sm font-medium">{t("trial.title")}</p>
          <p className="mt-0.5 text-sm text-foreground/50">{t("trial.description")}</p>
        </div>
      </div>
      {isOwner ? (
        <>
          <PlanPicker t={t} pending={pending} onCheckout={onCheckout} />
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
  t: (k: string, o?: Record<string, unknown>) => string
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

function PlanBadge({ plan }: { plan: ResolvedPlan }) {
  const { t } = useTranslation("subscription")
  const tone =
    plan === "locked"
      ? "bg-foreground/[0.06] text-foreground/50"
      : "bg-orange-400/10 text-orange-400"
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        tone,
      )}
    >
      {plan === "locked" && <Lock className="mr-1 inline h-2.5 w-2.5" />}
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
