import { useEffect } from "react"
import { useRouter } from "next/router"

// /dashboard/org/[orgSlug]/settings → settings/general (única seção geral hoje).
export default function SettingsIndex() {
  const router = useRouter()
  const { orgSlug } = router.query as { orgSlug?: string }

  useEffect(() => {
    if (!orgSlug) return
    void router.replace(`/dashboard/org/${orgSlug}/settings/general`)
  }, [orgSlug, router])

  return null
}
