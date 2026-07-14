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
    <div className="flex shrink-0 items-center justify-center gap-2 bg-orange-400/10 px-4 py-1.5 text-center text-xs text-orange-400 sm:text-sm">
      <Lock className="h-3.5 w-3.5 shrink-0" />
      <span>{t("lockedBanner.description")}</span>
      {isOwner && (
        <Link
          href={`/households/${householdSlug}/settings/subscription`}
          className="shrink-0 font-medium underline underline-offset-2 hover:opacity-80"
        >
          {t("lockedBanner.cta")}
        </Link>
      )}
    </div>
  )
}
