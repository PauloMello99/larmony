import { useEffect } from "react"
import { useRouter } from "next/router"

// /households/[householdSlug]/settings → settings/general (única seção geral hoje).
export default function SettingsIndex() {
  const router = useRouter()
  const { householdSlug } = router.query as { householdSlug?: string }

  useEffect(() => {
    if (!householdSlug) return
    void router.replace(`/households/${householdSlug}/settings/general`)
  }, [householdSlug, router])

  return null
}
