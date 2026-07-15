import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { GuestGuard, SignupForm } from "@/features/auth"
import { makeI18nProps } from "@/shared/lib/i18n"

const Signup: NextPageWithLayout = () => <SignupForm />

Signup.getLayout = (page: ReactElement) => <GuestGuard>{page}</GuestGuard>

export default Signup

export const getServerSideProps = makeI18nProps(["common", "auth"])
