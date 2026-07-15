import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { HouseholdLayout } from "@/features/dashboard"
import { GoalsPage as GoalsPageContent } from "@/features/goals"
import { makeI18nProps } from "@/shared/lib/i18n"

const GoalsPage: NextPageWithLayout = () => <GoalsPageContent />

GoalsPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <HouseholdLayout>{page}</HouseholdLayout>
  </AuthGuard>
)

export const getServerSideProps = makeI18nProps([
  "common",
  "dashboard",
  "onboarding",
  "goals",
  "subscription",
])

export default GoalsPage
