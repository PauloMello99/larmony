import { makeI18nProps } from "@/shared/lib/i18n"
import { useTranslation } from "react-i18next"
import type { ReactElement, ReactNode } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { DashboardLayout } from "@/features/dashboard"
import { SupportTicketsPage } from "@/features/support"

const SupportIndexPage: NextPageWithLayout = () => <SupportTicketsPage />

function SupportShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation("support")
  return (
    <AuthGuard>
      <DashboardLayout breadcrumbs={[{ label: t("list.title") }]}>{children}</DashboardLayout>
    </AuthGuard>
  )
}

SupportIndexPage.getLayout = (page: ReactElement) => <SupportShell>{page}</SupportShell>

export default SupportIndexPage

export const getServerSideProps = makeI18nProps(["common", "dashboard", "support"])
