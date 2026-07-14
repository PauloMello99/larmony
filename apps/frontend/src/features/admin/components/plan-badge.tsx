"use client"

import { useTranslation } from "react-i18next"
import { Badge } from "@/shared/components/ui/badge"
import type { SubscriptionPlanType } from "../types"

const PLAN_STYLES: Record<SubscriptionPlanType, string> = {
  free: "bg-foreground/[0.08] text-foreground/60",
  trial: "bg-orange-400/10 text-orange-400",
  standard: "bg-emerald-400/10 text-emerald-400",
  custom: "bg-sky-400/10 text-sky-400",
}

/** Badge de plano da lista/detalhe de lares; past_due ganha destaque de alerta. */
export function PlanBadge({
  plan,
  status,
}: {
  plan: SubscriptionPlanType
  status?: string | null
}) {
  const { t } = useTranslation("admin")
  const pastDue = status === "past_due"
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge className={PLAN_STYLES[plan]}>{t(`households.plan_${plan}`)}</Badge>
      {pastDue && (
        <Badge variant="destructive" className="bg-amber-500/15 text-amber-400">
          {t("households.pastDueBadge")}
        </Badge>
      )}
    </span>
  )
}
