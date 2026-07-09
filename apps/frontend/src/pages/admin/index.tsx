import { makeI18nProps } from "@/shared/lib/i18n"
import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { AdminLayout, AdminOverview } from "@/features/admin"

const AdminOverviewPage: NextPageWithLayout = () => <AdminOverview />

AdminOverviewPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <AdminLayout>{page}</AdminLayout>
  </AuthGuard>
)

export default AdminOverviewPage

export const getServerSideProps = makeI18nProps(["common", "dashboard"])
