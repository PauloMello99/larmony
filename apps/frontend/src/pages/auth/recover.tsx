import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { GuestGuard, RecoverForm } from "@/features/auth"
import { makeI18nProps } from "@/shared/lib/i18n"

const Recover: NextPageWithLayout = () => <RecoverForm />

Recover.getLayout = (page: ReactElement) => <GuestGuard>{page}</GuestGuard>

export default Recover

export const getServerSideProps = makeI18nProps(["common", "auth"])
