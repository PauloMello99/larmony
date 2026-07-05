import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, OrgPagePlaceholder } from "@/features/dashboard"

// Home da organização — placeholder até as features do Larmony existirem.
const OrgIndexPage: NextPageWithLayout = () => (
  <OrgPagePlaceholder
    title="Overview"
    description="O resumo do seu lar aparecerá aqui"
  />
)

OrgIndexPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default OrgIndexPage
