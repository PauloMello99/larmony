"use client"

import { useState } from "react"
import { useTranslation, Trans } from "react-i18next"
import {
  MoreHorizontal,
  UserMinus,
  ShieldCheck,
  Power,
  SlidersHorizontal,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import { Switch } from "@/shared/components/ui/switch"
import { formatDate, useActiveLocale } from "@/shared/lib/format"
import { MODULE_KEYS, type ModuleKey } from "@/features/dashboard/lib/nav"
import type { Member, Invitation, HouseholdRole } from "../types"

interface MemberListProps {
  members: Member[]
  invitations: Invitation[]
  currentUserEmail: string
  isOwner: boolean
  onUpdateRole: (memberId: string, role: HouseholdRole) => Promise<void>
  onRemove: (memberId: string) => Promise<void>
  onToggleStatus: (memberId: string, enabled: boolean) => Promise<void>
  onUpdatePermissions: (memberId: string, permissions: string[]) => Promise<void>
  onCancelInvitation: (invitationId: string) => Promise<void>
}

export function MemberList({
  members,
  invitations,
  currentUserEmail,
  isOwner,
  onUpdateRole,
  onRemove,
  onToggleStatus,
  onUpdatePermissions,
  onCancelInvitation,
}: MemberListProps) {
  const { t } = useTranslation("households")
  const { t: tCommon } = useTranslation("common")
  const locale = useActiveLocale()
  const [roleDialog, setRoleDialog] = useState<{ member: Member; role: HouseholdRole } | null>(null)
  const [removeDialog, setRemoveDialog] = useState<Member | null>(null)
  const [permsDialog, setPermsDialog] = useState<Member | null>(null)
  const [permsDraft, setPermsDraft] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  function openPerms(member: Member) {
    setPermsDraft(member.permissions ?? [])
    setPermsDialog(member)
  }

  function togglePerm(module: ModuleKey, on: boolean) {
    setPermsDraft((prev) =>
      on ? [...new Set([...prev, module])] : prev.filter((m) => m !== module),
    )
  }

  async function confirmPerms() {
    if (!permsDialog) return
    setLoading(true)
    try {
      await onUpdatePermissions(permsDialog.memberId, permsDraft)
      setPermsDialog(null)
    } finally {
      setLoading(false)
    }
  }

  async function confirmRoleChange() {
    if (!roleDialog) return
    setLoading(true)
    try {
      await onUpdateRole(roleDialog.member.memberId, roleDialog.role)
      setRoleDialog(null)
    } finally {
      setLoading(false)
    }
  }

  async function confirmRemove() {
    if (!removeDialog) return
    setLoading(true)
    try {
      await onRemove(removeDialog.memberId)
      setRemoveDialog(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      {/* Members section */}
      <section>
        <h3 className="mb-3 text-sm font-medium text-foreground/50 uppercase tracking-wide">
          {t("members.title", { count: members.length })}
        </h3>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-hidden rounded-lg border border-foreground/10">
          <Table>
            <TableHeader>
              <TableRow className="bg-foreground/[0.02] hover:bg-transparent">
                <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">{t("members.nameHeader")}</TableHead>
                <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">{t("members.emailHeader")}</TableHead>
                <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">{t("members.roleHeader")}</TableHead>
                <TableHead className="w-12 px-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isSelf = member.userEmail === currentUserEmail
                return (
                  <TableRow key={member.memberId}>
                    <TableCell className="px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold uppercase">
                          {member.userName.charAt(0)}
                        </div>
                        <span className="font-medium">
                          {member.userName}
                          {isSelf && (
                            <span className="ml-2 text-xs text-foreground/30">{t("members.you")}</span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 text-foreground/60">{member.userEmail}</TableCell>
                    <TableCell className="px-4">
                      <span
                        className={
                          member.role === "owner"
                            ? "inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                            : "inline-flex items-center rounded-md bg-foreground/5 px-2 py-0.5 text-xs font-medium text-foreground/50"
                        }
                      >
                        {t(`roles.${member.role}`)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4">
                      {isOwner && !isSelf && (
                        <MemberActions
                          member={member}
                          onChangeRole={(role) => setRoleDialog({ member, role })}
                          onRemove={() => setRemoveDialog(member)}
                          onToggleStatus={() =>
                            onToggleStatus(member.memberId, !member.enabled)
                          }
                          onPermissions={() => openPerms(member)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="grid gap-2 sm:hidden">
          {members.map((member) => {
            const isSelf = member.userEmail === currentUserEmail
            return (
              <div
                key={member.memberId}
                className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-sm font-semibold uppercase">
                  {member.userName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {member.userName}
                    {isSelf && <span className="ml-1 text-xs text-foreground/30">{t("members.you")}</span>}
                  </p>
                  <p className="truncate text-xs text-foreground/50">{member.userEmail}</p>
                </div>
                <span
                  className={
                    member.role === "owner"
                      ? "shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                      : "shrink-0 rounded-md bg-foreground/5 px-2 py-0.5 text-xs font-medium text-foreground/50"
                  }
                >
                  {t(`roles.${member.role}`)}
                </span>
                {isOwner && !isSelf && (
                  <MemberActions
                    member={member}
                    onChangeRole={(role) => setRoleDialog({ member, role })}
                    onRemove={() => setRemoveDialog(member)}
                    onToggleStatus={() =>
                      onToggleStatus(member.memberId, !member.enabled)
                    }
                    onPermissions={() => openPerms(member)}
                  />
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-medium text-foreground/50 uppercase tracking-wide">
            {t("members.pendingInvitations", { count: invitations.length })}
          </h3>
          <div className="grid gap-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-foreground/20 text-foreground/30">
                  ?
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{inv.email}</p>
                  <p className="text-xs text-foreground/40">
                    {t("members.invitationMeta", {
                      role: t(`roles.${inv.role}`),
                      date: formatDate(inv.expiresAt, locale, {
                        day: "2-digit",
                        month: "short",
                      }),
                    })}
                  </p>
                </div>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-red-400 hover:text-red-300"
                    onClick={() => onCancelInvitation(inv.id)}
                  >
                    {tCommon("actions.cancel")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Change role dialog */}
      <Dialog open={!!roleDialog} onOpenChange={(v) => !v && setRoleDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("roleDialog.title")}</DialogTitle>
            <DialogDescription>
              <Trans
                t={t}
                i18nKey="roleDialog.description"
                values={{ name: roleDialog?.member.userName }}
                components={{ span: <span className="font-medium text-foreground" /> }}
              />
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>{t("roleDialog.newRoleLabel")}</Label>
            <Select
              value={roleDialog?.role}
              onValueChange={(v) =>
                roleDialog && setRoleDialog({ ...roleDialog, role: v as HouseholdRole })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">{t("roles.member")}</SelectItem>
                <SelectItem value="owner">{t("roles.owner")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              disabled={loading}
              onClick={confirmRoleChange}
              className="w-full sm:w-auto"
            >
              {loading ? t("roleDialog.saving") : tCommon("actions.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions dialog (member module access) */}
      <Dialog open={!!permsDialog} onOpenChange={(v) => !v && setPermsDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("permissionsDialog.title")}</DialogTitle>
            <DialogDescription>
              <Trans
                t={t}
                i18nKey="permissionsDialog.description"
                values={{ name: permsDialog?.userName }}
                components={{ span: <span className="font-medium text-foreground" /> }}
              />
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1">
            {MODULE_KEYS.map((module) => {
              const on = permsDraft.includes(module)
              return (
                <label
                  key={module}
                  className="flex items-center justify-between gap-4 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] px-3 py-2.5"
                >
                  {/* MODULE_KEYS está vazio (código legado do salão) — caminho
                      inalcançável hoje, traduzido mecanicamente via modules.*. */}
                  <span className="text-sm text-foreground">
                    {t(`modules.${module}` as `modules.${string}`)}
                  </span>
                  <Switch
                    checked={on}
                    onCheckedChange={(v) => togglePerm(module, v)}
                  />
                </label>
              )
            })}
          </div>
          <DialogFooter>
            <Button
              disabled={loading}
              onClick={confirmPerms}
              className="w-full sm:w-auto"
            >
              {loading ? t("permissionsDialog.saving") : t("permissionsDialog.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove member dialog */}
      <Dialog open={!!removeDialog} onOpenChange={(v) => !v && setRemoveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("removeDialog.title")}</DialogTitle>
            <DialogDescription>
              <Trans
                t={t}
                i18nKey="removeDialog.description"
                values={{ name: removeDialog?.userName }}
                components={{ span: <span className="font-medium text-foreground" /> }}
              />
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={loading}
              onClick={confirmRemove}
              className="w-full sm:w-auto"
            >
              {loading ? t("removeDialog.removing") : t("removeDialog.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MemberActions({
  member,
  onChangeRole,
  onRemove,
  onToggleStatus,
  onPermissions,
}: {
  member: Member
  onChangeRole: (role: HouseholdRole) => void
  onRemove: () => void
  onToggleStatus: () => void
  onPermissions: () => void
}) {
  const { t } = useTranslation("households")
  const nextRole: HouseholdRole = member.role === "owner" ? "member" : "owner"
  const nextRoleLabel =
    nextRole === "owner" ? t("members.actions.makeOwner") : t("members.actions.makeMember")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {member.role === "member" && (
          <DropdownMenuItem onClick={onPermissions}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            {t("members.actions.permissions")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onChangeRole(nextRole)}>
          <ShieldCheck className="mr-2 h-4 w-4" />
          {nextRoleLabel}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleStatus}>
          <Power className="mr-2 h-4 w-4" />
          {member.enabled ? t("members.actions.disable") : t("members.actions.enable")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-400 focus:text-red-400"
          onClick={onRemove}
        >
          <UserMinus className="mr-2 h-4 w-4" />
          {t("members.actions.remove")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
