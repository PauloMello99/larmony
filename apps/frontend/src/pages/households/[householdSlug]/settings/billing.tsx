import { makeI18nProps } from "@/shared/lib/i18n"
import { useEffect } from "react"
import { useRouter } from "next/router"
import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { HouseholdLayout } from "@/features/dashboard"

const SettingsBillingPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { householdSlug } = router.query as { householdSlug?: string }

  useEffect(() => {
    if (householdSlug) {
      void router.replace(`/households/${householdSlug}/settings/subscription`)
    }
  }, [householdSlug, router])

  return null
}

SettingsBillingPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <HouseholdLayout>{page}</HouseholdLayout>
  </AuthGuard>
)

export default SettingsBillingPage

export const getServerSideProps = makeI18nProps(["common", "dashboard", "onboarding", "subscription"])
