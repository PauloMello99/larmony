import { useEffect } from "react"
import { useRouter } from "next/router"

// /dashboard/household/[householdSlug]/settings → settings/general (única seção geral hoje).
export default function SettingsIndex() {
  const router = useRouter()
  const { householdSlug } = router.query as { householdSlug?: string }

  useEffect(() => {
    if (!householdSlug) return
    void router.replace(`/dashboard/household/${householdSlug}/settings/general`)
  }, [householdSlug, router])

  return null
}
