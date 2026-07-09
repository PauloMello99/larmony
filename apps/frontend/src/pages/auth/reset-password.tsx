import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { GuestGuard, ResetPasswordForm } from "@/features/auth"
import { makeI18nProps } from "@/shared/lib/i18n"

const ResetPasswordPage: NextPageWithLayout = () => <ResetPasswordForm />

// allowRecoveryToken: um usuário logado seguindo o link de redefinição de
// senha do e-mail deve ver o form, não ser redirecionado.
ResetPasswordPage.getLayout = (page: ReactElement) => (
  <GuestGuard allowRecoveryToken>{page}</GuestGuard>
)

export default ResetPasswordPage

export const getServerSideProps = makeI18nProps(["common", "auth"])
