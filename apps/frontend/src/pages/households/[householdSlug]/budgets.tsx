import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { HouseholdLayout } from "@/features/dashboard"
import { BudgetsPage as BudgetsPageContent } from "@/features/budgets"
import { makeI18nProps } from "@/shared/lib/i18n"

const BudgetsPage: NextPageWithLayout = () => <BudgetsPageContent />

BudgetsPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <HouseholdLayout>{page}</HouseholdLayout>
  </AuthGuard>
)

export const getServerSideProps = makeI18nProps([
  "common",
  "dashboard",
  "onboarding",
  "budgets",
  "subscription",
])

export default BudgetsPage