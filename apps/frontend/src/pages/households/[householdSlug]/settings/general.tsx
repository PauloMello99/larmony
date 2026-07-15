import { makeI18nProps } from "@/shared/lib/i18n"
import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { HouseholdLayout, HouseholdSettingsLayout, useCurrentHousehold } from "@/features/dashboard"
import { HouseholdSettingsPage } from "@/features/households"

const GeneralSettingsPage: NextPageWithLayout = () => {
  const { householdId } = useCurrentHousehold()
  return <HouseholdSettingsPage householdId={householdId} />
}

GeneralSettingsPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <HouseholdLayout>
      <HouseholdSettingsLayout>{page}</HouseholdSettingsLayout>
    </HouseholdLayout>
  </AuthGuard>
)

export default GeneralSettingsPage

export const getServerSideProps = makeI18nProps([
  "common",
  "dashboard",
  "onboarding",
  "households",
  "subscription",
])
