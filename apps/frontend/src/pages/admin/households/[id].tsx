import { makeI18nProps } from "@/shared/lib/i18n"
import type { ReactElement } from "react"
import { useRouter } from "next/router"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { AdminLayout, AdminHouseholdDetail } from "@/features/admin"

const AdminHouseholdDetailPage: NextPageWithLayout = () => {
  const router = useRouter()
  const id = typeof router.query.id === "string" ? router.query.id : undefined
  return <AdminHouseholdDetail id={id} />
}

AdminHouseholdDetailPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <AdminLayout>{page}</AdminLayout>
  </AuthGuard>
)

export default AdminHouseholdDetailPage

export const getServerSideProps = makeI18nProps(["common", "dashboard", "admin"])
