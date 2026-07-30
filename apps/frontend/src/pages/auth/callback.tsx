import { SocialCallbackHandler } from "@/features/auth"
import { makeI18nProps } from "@/shared/lib/i18n"

// Sem getLayout: nem GuestGuard (redirecionaria no instante em que `user` fica
// non-null, entrando em corrida com o roteamento deste handler) nem AuthGuard
// (não há sessão na montagem). O layout é embutido no próprio handler.
export default function AuthCallbackPage() {
  return <SocialCallbackHandler />
}

export const getServerSideProps = makeI18nProps(["common", "auth"])
