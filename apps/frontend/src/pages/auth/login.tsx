import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { GuestGuard, LoginForm } from "@/features/auth"
import { makeI18nProps } from "@/shared/lib/i18n"

const Login: NextPageWithLayout = () => <LoginForm />

Login.getLayout = (page: ReactElement) => <GuestGuard>{page}</GuestGuard>

export const getServerSideProps = makeI18nProps(["common", "auth"])

export default Login
