import { useRouter } from "next/router"
import { makeI18nProps } from "@/shared/lib/i18n"
import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { AdminLayout, AdminSupportTicketDetail } from "@/features/admin"

const AdminSupportTicketDetailPage: NextPageWithLayout = () => {
  const router = useRouter()
  const id = typeof router.query.id === "string" ? router.query.id : undefined
  return <AdminSupportTicketDetail id={id} />
}

AdminSupportTicketDetailPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <AdminLayout>{page}</AdminLayout>
  </AuthGuard>
)

export default AdminSupportTicketDetailPage

export const getServerSideProps = makeI18nProps(["common", "dashboard", "admin"])
