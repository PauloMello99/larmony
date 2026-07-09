import { makeI18nProps } from "@/shared/lib/i18n"
import { AcceptInvitationPage } from "@/features/invitations"

export default function InviteAcceptRoute() {
  return <AcceptInvitationPage />
}

export const getServerSideProps = makeI18nProps(["common", "invitations"])
