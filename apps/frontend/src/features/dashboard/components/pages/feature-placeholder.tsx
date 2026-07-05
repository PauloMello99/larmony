import * as React from "react"
import { useTranslation } from "react-i18next"
import type { FeaturePageMeta } from "@/features/dashboard/lib/nav"

interface FeaturePlaceholderProps {
  feature: FeaturePageMeta
}

/**
 * Placeholder rico das features do roadmap (M2+): mostra o que a feature será
 * (título + descrição do domínio) e em qual milestone chega. Substituído pela
 * página real quando o milestone for entregue.
 */
export function FeaturePlaceholder({ feature }: FeaturePlaceholderProps) {
  const { t } = useTranslation("dashboard")
  const Icon = feature.icon

  return (
    <div className="flex flex-col">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          {t(`placeholders.${feature.key}.title`)}
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          {t(`placeholders.${feature.key}.description`)}
        </p>
      </div>

      <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-dashed border-foreground/[0.08]">
        <div className="px-6 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Icon className="h-7 w-7 text-primary" />
          </span>
          <p className="text-sm font-medium text-foreground/60">
            {t("placeholders.underConstruction")}
          </p>
          <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {t("placeholders.arriving", { milestone: feature.milestone })}
          </span>
        </div>
      </div>
    </div>
  )
}
