"use client"

import { useState } from "react"
import { useRouter } from "next/router"
import { useTranslation } from "react-i18next"
import { Loader2, AlertCircle, UserPlus } from "lucide-react"
import { useHousehold } from "@/features/dashboard/hooks/use-households"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { Button } from "@/shared/components/ui/button"
import { useHouseholdMutations } from "../hooks/use-household-mutations"
import { useMembers } from "../hooks/use-members"
import { EditHouseholdForm } from "./edit-household-form"
import { DeleteHouseholdDialog } from "./delete-household-dialog"
import { TransferHouseholdDialog } from "./transfer-household-dialog"
import { MemberList } from "./member-list"
import { InviteMemberForm } from "./invite-member-form"
import type { UpdateHouseholdFormValues, InviteFormValues } from "../schemas/household.schemas"
import type { HouseholdRole } from "../types"

interface HouseholdSettingsPageProps {
  householdId: string
}

export function HouseholdSettingsPage({ householdId }: HouseholdSettingsPageProps) {
  const { t } = useTranslation("households")
  const router = useRouter()
  const { household, loading, isOwner, notFound } = useHousehold(householdId)
  const { updateHousehold, deleteHousehold, transferOwnership } = useHouseholdMutations(householdId)
  const { user } = useAuth()
  const { members, invitations, inviteMember, updateMemberRole, removeMember, setMemberStatus, updateMemberPermissions, cancelInvitation } =
    useMembers(householdId)
  const [inviteOpen, setInviteOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-foreground/40">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("settings.loading")}
      </div>
    )
  }

  if (notFound || !household) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {t("settings.notFound")}
      </div>
    )
  }

  async function handleUpdate(values: UpdateHouseholdFormValues) {
    await updateHousehold(values)
  }

  async function handleDelete() {
    await deleteHousehold()
    await router.push("/households")
  }

  async function handleInvite(values: InviteFormValues) {
    await inviteMember(values.email, values.role as HouseholdRole)
  }

  return (
    <div className="grid gap-10">
      {/* General info */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{t("settings.generalTitle")}</h2>
          <p className="text-sm text-foreground/50">{t("settings.generalDescription")}</p>
        </div>

        {isOwner ? (
          <div>
            <EditHouseholdForm household={household} onSubmit={handleUpdate} />
          </div>
        ) : (
          <div className="grid max-w-lg gap-3">
            <div className="grid gap-1">
              <span className="text-xs text-foreground/40">{t("settings.nameLabel")}</span>
              <span className="font-medium">{household.name}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-xs text-foreground/40">{t("settings.slugLabel")}</span>
              <span className="font-mono text-sm text-foreground/70">/{household.slug}</span>
            </div>
          </div>
        )}
      </section>

      {/* Members */}
      <section data-tour="settings-members">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t("settings.membersTitle")}</h2>
            <p className="text-sm text-foreground/50">{t("settings.membersDescription")}</p>
          </div>
          {isOwner && (
            <Button size="sm" className="w-full sm:w-auto" onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              {t("settings.invite")}
            </Button>
          )}
        </div>

        <MemberList
          members={members}
          invitations={invitations}
          currentUserEmail={user?.email ?? ""}
          isOwner={isOwner}
          onUpdateRole={async (memberId, role) => {
            await updateMemberRole(memberId, role)
          }}
          onRemove={removeMember}
          onToggleStatus={async (memberId, enabled) => {
            await setMemberStatus(memberId, enabled)
          }}
          onUpdatePermissions={async (memberId, permissions) => {
            await updateMemberPermissions(memberId, permissions)
          }}
          onCancelInvitation={cancelInvitation}
        />

        <InviteMemberForm
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          onSubmit={handleInvite}
        />
      </section>

      {/* Transfer household — owner only */}
      {isOwner && (
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">{t("settings.transferTitle")}</h2>
            <p className="text-sm text-foreground/50">
              {t("settings.transferDescription")}
            </p>
          </div>
          <div className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-foreground/50">
                {t("settings.transferProse")}
              </p>
              <TransferHouseholdDialog
                members={members}
                currentUserEmail={user?.email ?? ""}
                onConfirm={async (memberId) => {
                  await transferOwnership(memberId)
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Danger zone — owner only */}
      {isOwner && (
        <section>
          <div className="rounded-lg border border-red-500/20 p-4 sm:p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-red-400">{t("settings.dangerTitle")}</h3>
              <p className="mt-1 text-sm text-foreground/50">{t("settings.dangerDescription")}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">{t("settings.deleteTitle")}</p>
                <p className="text-xs text-foreground/40">
                  {t("settings.deleteDescription")}
                </p>
              </div>
              <DeleteHouseholdDialog household={household} onConfirm={handleDelete} />
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
