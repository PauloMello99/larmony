import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { HouseholdLayout } from "@/features/dashboard"
import { ScheduledTransactionsPage as ScheduledTransactionsPageContent } from "@/features/scheduled-transactions"
import { makeI18nProps } from "@/shared/lib/i18n"

const ScheduledTransactionsPage: NextPageWithLayout = () => <ScheduledTransactionsPageContent />

ScheduledTransactionsPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <HouseholdLayout>{page}</HouseholdLayout>
  </AuthGuard>
)

export const getServerSideProps = makeI18nProps([
  "common",
  "dashboard",
  "onboarding",
  "scheduled-transactions",
  "subscription",
])

export default ScheduledTransactionsPage
