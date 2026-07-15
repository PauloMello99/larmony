import { makeI18nProps } from "@/shared/lib/i18n"
import { useTranslation } from "react-i18next"
import type { ReactElement, ReactNode } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { DashboardLayout } from "@/features/dashboard"
import { AccountPage } from "@/features/account"

// Rota única da conta: profile, access, theme e danger viram sections numa
// página rolável com navegação por âncoras (#hash). Ver features/account.
const AccountIndexPage: NextPageWithLayout = () => <AccountPage />

// Wrapper-componente para o breadcrumb usar t() (getLayout em si não pode usar hooks).
function AccountShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation("dashboard")
  return (
    <AuthGuard>
      <DashboardLayout breadcrumbs={[{ label: t("userMenu.account") }]}>{children}</DashboardLayout>
    </AuthGuard>
  )
}

AccountIndexPage.getLayout = (page: ReactElement) => <AccountShell>{page}</AccountShell>

export default AccountIndexPage

export const getServerSideProps = makeI18nProps(["common", "dashboard", "account"])
