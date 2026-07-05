import { useEffect } from "react"
import { useRouter } from "next/router"

// /dashboard/household/[householdSlug]/billing → redirect to /dashboard/household/[householdSlug]/settings/billing
export default function BillingRedirect() {
  const router = useRouter()
  const { householdSlug } = router.query as { householdSlug?: string }

  useEffect(() => {
    if (householdSlug) {
      void router.replace(`/dashboard/household/${householdSlug}/settings/billing`)
    }
  }, [householdSlug, router])

  return null
}
