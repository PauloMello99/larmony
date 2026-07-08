import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { HouseholdLayout } from "@/features/dashboard"
import { ReportsPage } from "@/features/reports"
import { makeI18nProps } from "@/shared/lib/i18n"

const Page: NextPageWithLayout = () => <ReportsPage />

Page.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <HouseholdLayout>{page}</HouseholdLayout>
  </AuthGuard>
)

export const getServerSideProps = makeI18nProps(["common", "dashboard", "onboarding"])

export default Page
