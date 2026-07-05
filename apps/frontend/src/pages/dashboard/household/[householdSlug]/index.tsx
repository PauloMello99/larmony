import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { HouseholdLayout, HouseholdPagePlaceholder } from "@/features/dashboard"

// Home da lar — placeholder até as features do Larmony existirem.
const HouseholdIndexPage: NextPageWithLayout = () => (
  <HouseholdPagePlaceholder
    title="Overview"
    description="O resumo do seu lar aparecerá aqui"
  />
)

HouseholdIndexPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <HouseholdLayout>{page}</HouseholdLayout>
  </AuthGuard>
)

export default HouseholdIndexPage
