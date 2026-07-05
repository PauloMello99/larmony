import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { AdminLayout, AdminHouseholds } from "@/features/admin"

const AdminHouseholdsPage: NextPageWithLayout = () => <AdminHouseholds />

AdminHouseholdsPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <AdminLayout>{page}</AdminLayout>
  </AuthGuard>
)

export default AdminHouseholdsPage
