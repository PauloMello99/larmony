import { makeI18nProps } from "@/shared/lib/i18n"
import { useTranslation } from "react-i18next"
import type { ReactElement, ReactNode } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import {
  DashboardLayout,
  HouseholdsContent,
} from "@/features/dashboard"

const HouseholdsPage: NextPageWithLayout = () => <HouseholdsContent />

// Wrapper-componente para o breadcrumb usar t() (getLayout em si não pode usar hooks).
function HouseholdsShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation("dashboard")
  return (
    <AuthGuard>
      <DashboardLayout breadcrumbs={[{ label: t("nav.households") }]}>{children}</DashboardLayout>
    </AuthGuard>
  )
}

HouseholdsPage.getLayout = (page: ReactElement) => <HouseholdsShell>{page}</HouseholdsShell>

export default HouseholdsPage

// "households": CreateHouseholdForm (Sheet de novo lar) usa esse namespace.
export const getServerSideProps = makeI18nProps(["common", "dashboard", "households"])
