import { makeI18nProps } from "@/shared/lib/i18n"
import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { AdminLayout, AdminAuditLogs } from "@/features/admin"

const AdminAuditLogsPage: NextPageWithLayout = () => <AdminAuditLogs />

AdminAuditLogsPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <AdminLayout>{page}</AdminLayout>
  </AuthGuard>
)

export default AdminAuditLogsPage

export const getServerSideProps = makeI18nProps(["common", "dashboard"])
