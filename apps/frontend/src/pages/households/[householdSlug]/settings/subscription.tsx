import { makeI18nProps } from "@/shared/lib/i18n"
import { useTranslation } from "react-i18next"
import type { ReactElement } from "react"
import { CreditCard } from "lucide-react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { HouseholdLayout, HouseholdSettingsLayout } from "@/features/dashboard"

const SettingsSubscriptionPage: NextPageWithLayout = () => {
  const { t } = useTranslation("households")
  return (
    <div className="grid gap-8">
      <div>
        <h2 className="text-lg font-semibold">{t("subscription.title")}</h2>
        <p className="mt-0.5 text-sm text-foreground/50">
          {t("subscription.description")}
        </p>
      </div>

      <section className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-5">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-orange-400" />
          <h3 className="text-sm font-medium">{t("subscription.managementTitle")}</h3>
          <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wide text-foreground/40">
            {t("subscription.comingSoon")}
          </span>
        </div>
        <p className="mt-2 text-sm text-foreground/50">
          {t("subscription.managementDescription")}
        </p>
      </section>
    </div>
  )
}

SettingsSubscriptionPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <HouseholdLayout>
      <HouseholdSettingsLayout>{page}</HouseholdSettingsLayout>
    </HouseholdLayout>
  </AuthGuard>
)

export default SettingsSubscriptionPage

export const getServerSideProps = makeI18nProps(["common", "dashboard", "onboarding", "households"])
