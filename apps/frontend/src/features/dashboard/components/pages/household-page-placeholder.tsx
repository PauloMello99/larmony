import * as React from "react"
import { useTranslation } from "react-i18next"
import { Construction } from "lucide-react"

interface HouseholdPagePlaceholderProps {
  title: string
  description?: string
}

export function HouseholdPagePlaceholder({ title, description }: HouseholdPagePlaceholderProps) {
  const { t } = useTranslation("dashboard")
  return (
    <div className="flex flex-col">
      {/* Page title */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-foreground/40">{description}</p>
        )}
      </div>

      {/* Placeholder content */}
      <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-dashed border-foreground/[0.08]">
        <div className="text-center">
          <Construction className="mx-auto mb-3 h-8 w-8 text-foreground/20" />
          <p className="text-sm font-medium text-foreground/30">
            {t("placeholders.underConstruction")}
          </p>
          <p className="mt-1 text-xs text-foreground/20">
            {t("placeholders.comingSoon")}
          </p>
        </div>
      </div>
    </div>
  )
}
