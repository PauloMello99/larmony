import { makeI18nProps } from "@/shared/lib/i18n"
import { useEffect } from "react"
import { useRouter } from "next/router"

// /households/[householdSlug]/billing → redirect to /households/[householdSlug]/settings/billing
export default function BillingRedirect() {
  const router = useRouter()
  const { householdSlug } = router.query as { householdSlug?: string }

  useEffect(() => {
    if (householdSlug) {
      void router.replace(`/households/${householdSlug}/settings/billing`)
    }
  }, [householdSlug, router])

  return null
}

export const getServerSideProps = makeI18nProps(["common", "dashboard", "onboarding"])
