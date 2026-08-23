import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { HouseholdLayout } from "@/features/dashboard"
import { StatementImportsPage as StatementImportsPageContent } from "@/features/statement-imports"
import { makeI18nProps } from "@/shared/lib/i18n"

const StatementImportsPage: NextPageWithLayout = () => <StatementImportsPageContent />

StatementImportsPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <HouseholdLayout>{page}</HouseholdLayout>
  </AuthGuard>
)

export const getServerSideProps = makeI18nProps([
  "common",
  "dashboard",
  "statement-imports",
  "subscription",
])

export default StatementImportsPage
