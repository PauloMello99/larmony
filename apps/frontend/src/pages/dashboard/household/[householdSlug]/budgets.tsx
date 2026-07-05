import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { HouseholdLayout, FeaturePlaceholder, FEATURE_PAGES } from "@/features/dashboard"
import { makeI18nProps } from "@/shared/lib/i18n"

const feature = FEATURE_PAGES.find((f) => f.href === "budgets")!

const BudgetsPage: NextPageWithLayout = () => <FeaturePlaceholder feature={feature} />

BudgetsPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <HouseholdLayout>{page}</HouseholdLayout>
  </AuthGuard>
)

export const getServerSideProps = makeI18nProps(["common", "dashboard"])

export default BudgetsPage