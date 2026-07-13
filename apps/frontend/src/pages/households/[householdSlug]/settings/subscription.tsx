import { makeI18nProps } from "@/shared/lib/i18n"
import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { HouseholdLayout, HouseholdSettingsLayout } from "@/features/dashboard"
import { SubscriptionPage } from "@/features/subscription"

const SettingsSubscriptionPage: NextPageWithLayout = () => <SubscriptionPage />

SettingsSubscriptionPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <HouseholdLayout>
      <HouseholdSettingsLayout>{page}</HouseholdSettingsLayout>
    </HouseholdLayout>
  </AuthGuard>
)

export default SettingsSubscriptionPage

export const getServerSideProps = makeI18nProps([
  "common",
  "dashboard",
  "onboarding",
  "households",
  "subscription",
])
