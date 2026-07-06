import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { HouseholdLayout } from "@/features/dashboard"
import { BillsPage as BillsPageContent } from "@/features/bills"
import { makeI18nProps } from "@/shared/lib/i18n"

const BillsPage: NextPageWithLayout = () => <BillsPageContent />

BillsPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <HouseholdLayout>{page}</HouseholdLayout>
  </AuthGuard>
)

export const getServerSideProps = makeI18nProps(["common", "dashboard"])

export default BillsPage