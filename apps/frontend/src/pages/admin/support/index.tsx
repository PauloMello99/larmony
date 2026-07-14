import { makeI18nProps } from "@/shared/lib/i18n"
import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { AdminLayout, AdminSupportInbox } from "@/features/admin"

const AdminSupportIndexPage: NextPageWithLayout = () => <AdminSupportInbox />

AdminSupportIndexPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <AdminLayout>{page}</AdminLayout>
  </AuthGuard>
)

export default AdminSupportIndexPage

export const getServerSideProps = makeI18nProps(["common", "dashboard", "admin"])
