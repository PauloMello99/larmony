import { makeI18nProps } from "@/shared/lib/i18n"
import { AcceptInvitationPage } from "@/features/invitations"
import { TermsReacceptDialog } from "@/features/auth/components/terms-reaccept-dialog"

export default function InviteAcceptRoute() {
  return (
    <>
      <AcceptInvitationPage />
      <TermsReacceptDialog />
    </>
  )
}

export const getServerSideProps = makeI18nProps(["common", "invitations"])
