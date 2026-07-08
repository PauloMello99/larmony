import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { HouseholdLayout } from "@/features/dashboard"
import { TransactionsPage as TransactionsPageContent } from "@/features/transactions"
import { makeI18nProps } from "@/shared/lib/i18n"

const TransactionsPage: NextPageWithLayout = () => <TransactionsPageContent />

TransactionsPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <HouseholdLayout>{page}</HouseholdLayout>
  </AuthGuard>
)

export const getServerSideProps = makeI18nProps(["common", "dashboard", "onboarding"])

export default TransactionsPage