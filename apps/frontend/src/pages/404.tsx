import type { ReactElement } from "react"
import { useEffect } from "react"
import { useRouter } from "next/router"

export default function NotFound() {
  const router = useRouter()

  useEffect(() => {
    void router.replace("/households")
  }, [router])

  return null
}

// No layout — bare redirect page
NotFound.getLayout = (page: ReactElement) => page
