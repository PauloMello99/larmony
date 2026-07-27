"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Lock } from "lucide-react"

interface LockedBannerProps {
  householdSlug: string
  isOwner: boolean
}

/**
 * Banner de somente-leitura mostrado em toda página de um lar sem assinatura
 * ativa (M16). Reflete o backend (`ActiveSubscriptionGuard`/402) — só avisa,
 * nunca decide acesso no cliente.
 */
export function LockedBanner({ householdSlug, isOwner }: LockedBannerProps) {
  const { t } = useTranslation("subscription")

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 bg-warning/20 px-4 py-2 text-center text-sm font-medium text-warning sm:gap-3 sm:py-2.5 sm:text-base">
      <Lock className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
      <span>{t("lockedBanner.description")}</span>
      {isOwner && (
        <Link
          href={`/households/${householdSlug}/settings/subscription`}
          className="shrink-0 rounded-md bg-warning px-3 py-1 text-xs font-semibold text-warning-foreground transition-colors hover:bg-warning/90 sm:text-sm"
        >
          {t("lockedBanner.cta")}
        </Link>
      )}
    </div>
  )
}
