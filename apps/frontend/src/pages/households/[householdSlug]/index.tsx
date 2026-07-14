import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { HouseholdLayout, HouseholdOverview } from "@/features/dashboard"
import { makeI18nProps } from "@/shared/lib/i18n"

// Home do lar: esqueleto real do dashboard (dados chegam no M2).
const HouseholdIndexPage: NextPageWithLayout = () => <HouseholdOverview />

HouseholdIndexPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <HouseholdLayout>{page}</HouseholdLayout>
  </AuthGuard>
)

export const getServerSideProps = makeI18nProps(["common", "dashboard", "onboarding", "subscription"])

export default HouseholdIndexPage
