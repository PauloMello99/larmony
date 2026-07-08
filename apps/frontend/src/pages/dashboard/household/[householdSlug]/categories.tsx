import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { HouseholdLayout } from "@/features/dashboard"
import { CategoriesPage as CategoriesPageContent } from "@/features/categories"
import { makeI18nProps } from "@/shared/lib/i18n"

const CategoriesPage: NextPageWithLayout = () => <CategoriesPageContent />

CategoriesPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <HouseholdLayout>{page}</HouseholdLayout>
  </AuthGuard>
)

export const getServerSideProps = makeI18nProps(["common", "dashboard"])

export default CategoriesPage