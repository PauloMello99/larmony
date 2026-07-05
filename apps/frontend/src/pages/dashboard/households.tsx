import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import {
  DashboardLayout,
  HouseholdsContent,
} from "@/features/dashboard"

const HouseholdsPage: NextPageWithLayout = () => <HouseholdsContent />

HouseholdsPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <DashboardLayout breadcrumbs={[{ label: "Lares" }]}>
      {page}
    </DashboardLayout>
  </AuthGuard>
)

export default HouseholdsPage
