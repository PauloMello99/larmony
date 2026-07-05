import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { GuestGuard, SignupForm } from "@/features/auth"

const Signup: NextPageWithLayout = () => <SignupForm />

Signup.getLayout = (page: ReactElement) => <GuestGuard>{page}</GuestGuard>

export default Signup
