import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { GuestGuard, RecoverForm } from "@/features/auth"

const Recover: NextPageWithLayout = () => <RecoverForm />

Recover.getLayout = (page: ReactElement) => <GuestGuard>{page}</GuestGuard>

export default Recover
