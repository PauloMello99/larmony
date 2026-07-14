import { useRouter } from "next/router"
import { makeI18nProps } from "@/shared/lib/i18n"
import { useTranslation } from "react-i18next"
import type { ReactElement, ReactNode } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { DashboardLayout } from "@/features/dashboard"
import { SupportTicketThread } from "@/features/support"

const SupportTicketDetailPage: NextPageWithLayout = () => {
  const router = useRouter()
  const id = typeof router.query.id === "string" ? router.query.id : undefined
  return <SupportTicketThread id={id} />
}

function SupportShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation("support")
  return (
    <AuthGuard>
      <DashboardLayout
        breadcrumbs={[{ label: t("list.title"), href: "/support" }, { label: t("thread.title") }]}
      >
        {children}
      </DashboardLayout>
    </AuthGuard>
  )
}

SupportTicketDetailPage.getLayout = (page: ReactElement) => <SupportShell>{page}</SupportShell>

export default SupportTicketDetailPage

export const getServerSideProps = makeI18nProps(["common", "dashboard", "support"])
