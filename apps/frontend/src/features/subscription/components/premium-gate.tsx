"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Lock } from "lucide-react"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { useCurrentHousehold } from "@/features/dashboard/components/household-context"

interface PremiumGateProps {
  className?: string
  /** Sobrescreve a descrição default (relatórios avançados) para outras capabilities. */
  descriptionKey?: string
}

/**
 * Card de paywall reutilizável, mostrado onde uma capability premium falta.
 * Reflete o backend — não decide acesso, só oferece o upgrade. O CTA leva pra
 * página de assinatura do lar. `descriptionKey` permite reusar o mesmo card
 * para capabilities além de `advanced_reports` (ex.: categorias personalizadas).
 */
export function PremiumGate({ className, descriptionKey }: PremiumGateProps) {
  const { t } = useTranslation("subscription")
  const { household } = useCurrentHousehold()
  const href = `/households/${household.slug}/settings/subscription`

  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-400/10">
        <Lock className="h-5 w-5 text-orange-400" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">
        {t("gate.title")}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-foreground/50">
        {t(descriptionKey ?? "gate.description")}
      </p>
      <Link href={href} className={cn(buttonVariants({ size: "sm" }), "mt-6")}>
        {t("gate.cta")}
      </Link>
    </div>
  )
}
