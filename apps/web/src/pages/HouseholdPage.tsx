import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { UserPlus, Trash2, Crown, Home, Mail, Plus, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { apiPost } from '@/services/apiClient'
import { useAuth } from '@/contexts/AuthContext'
import { useMembers } from '@/queries/members'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner'

function initials(name: string | null) {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

const renameSchema = z.object({ name: z.string().min(2, 'Mínimo 2 caracteres').max(60) })
const inviteSchema = z.object({ email: z.string().email('E-mail inválido') })
const createHouseholdSchema = z.object({ name: z.string().min(2, 'Mínimo 2 caracteres').max(60) })

type RenameForm = z.infer<typeof renameSchema>
type InviteForm = z.infer<typeof inviteSchema>
type CreateHouseholdForm = z.infer<typeof createHouseholdSchema>

export default function HouseholdPage() {
  const { t } = useTranslation()
  const {
    householdId,
    user,
    refreshProfile,
    households,
    activeHouseholdId,
    setActiveHouseholdId,
  } = useAuth()
  const { data: members = [], isLoading: membersLoading } = useMembers()
  const qc = useQueryClient()

  const [inviteOpen, setInviteOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | undefined>()
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  // Fetch household details
  const { data: household, isLoading: householdLoading } = useQuery({
    queryKey: ['household', householdId],
    queryFn: async () => {
      if (!householdId) return null
      const { data } = await supabase.from('households').select('*').eq('id', householdId).single()
      return data
    },
    enabled: !!householdId,
  })

  // Fetch pending invites
  const { data: invites = [] } = useQuery({
    queryKey: ['invites', householdId],
    queryFn: async () => {
      if (!householdId) return []
      const { data } = await supabase
        .from('household_invites')
        .select('*')
        .eq('household_id', householdId)
        .is('accepted_at', null)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
      return data ?? []
    },
    enabled: !!householdId,
  })

  const isOwner = household?.owner_id === user?.id

  // Rename household
  const renameForm = useForm<RenameForm>({
    resolver: zodResolver(renameSchema),
    values: { name: household?.name ?? '' },
  })
  const renameMut = useMutation({
    mutationFn: async (data: RenameForm) => {
      const { error } = await supabase
        .from('households')
        .update({ name: data.name })
        .eq('id', householdId!)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['household', householdId] })
      refreshProfile()
    },
  })

  // Invite member via backend (sends email via Resend)
  const inviteForm = useForm<InviteForm>({ resolver: zodResolver(inviteSchema) })
  const inviteMut = useMutation({
    mutationFn: async (data: InviteForm) => {
      await apiPost('/api/household-invites', { householdId: householdId!, email: data.email })
      return data.email
    },
    onSuccess: (email) => {
      qc.invalidateQueries({ queryKey: ['invites', householdId] })
      setInviteSuccess(email)
      inviteForm.reset()
      setInviteOpen(false)
    },
  })

  // Remove member
  const removeMemberMut = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('household_memberships').delete().eq('id', memberId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', householdId] }),
  })

  // Cancel invite
  const cancelInviteMut = useMutation({
    mutationFn: async (inviteId: string) => {
      await supabase.from('household_invites').delete().eq('id', inviteId)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites', householdId] }),
  })

  // Create new household
  const createHouseholdForm = useForm<CreateHouseholdForm>({
    resolver: zodResolver(createHouseholdSchema),
  })
  const createHouseholdMut = useMutation({
    mutationFn: async (data: CreateHouseholdForm) => {
      const { data: newHousehold, error } = await supabase
        .from('households')
        .insert({ name: data.name, owner_id: user!.id })
        .select()
        .single()
      if (error) throw error

      const { error: memberError } = await supabase.from('household_memberships').insert({
        household_id: newHousehold.id,
        user_id: user!.id,
        role: 'owner',
      })
      if (memberError) throw memberError

      return newHousehold.id
    },
    onSuccess: async (newId) => {
      await refreshProfile()
      setActiveHouseholdId(newId)
      createHouseholdForm.reset()
      setCreateOpen(false)
    },
  })

  if (householdLoading || membersLoading) return <LoadingSpinner />

  const memberToRemove = members.find((m) => m.id === removingMemberId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('household.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('household.subtitle')}</p>
      </div>

      {/* My Households */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base">{t('household.myHouseholds.title')}</CardTitle>
            <CardDescription>{t('household.myHouseholds.description')}</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            {t('household.myHouseholds.createButton')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {households.map((h) => (
            <div
              key={h.id}
              className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                h.id === activeHouseholdId ? 'border-primary/50 bg-primary/5' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <Home className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">{h.name}</span>
                {h.id === activeHouseholdId && (
                  <Badge variant="secondary" className="text-xs">
                    {t('household.myHouseholds.active')}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs gap-1">
                  {h.role === 'owner' ? (
                    <><Crown className="size-3" />{t('household.members.owner')}</>
                  ) : (
                    t('household.members.member')
                  )}
                </Badge>
                {h.id !== activeHouseholdId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setActiveHouseholdId(h.id)}
                  >
                    <Check className="mr-1 size-3" />
                    {t('household.myHouseholds.enter')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Household info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Home className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">{t('household.info.title')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isOwner ? (
              <form
                onSubmit={renameForm.handleSubmit((d) => renameMut.mutateAsync(d))}
                className="space-y-3"
              >
                <div className="space-y-2">
                  <Label>{t('household.info.householdName')}</Label>
                  <Input {...renameForm.register('name')} />
                  {renameForm.formState.errors.name && (
                    <p className="text-xs text-destructive">
                      {renameForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={renameForm.formState.isSubmitting || !renameForm.formState.isDirty}
                >
                  {t('household.info.saveName')}
                </Button>
              </form>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium">{household?.name}</p>
                <p className="text-xs text-muted-foreground">{t('household.info.memberNote')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-base">
                {t('household.members.title')} ({members.length})
              </CardTitle>
              <CardDescription>{t('household.members.description')}</CardDescription>
            </div>
            {isOwner && (
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="mr-2 size-4" /> {t('household.members.invite')}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">
                      {initials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{member.full_name ?? 'Usuário'}</p>
                    <div className="flex items-center gap-1.5">
                      {member.role === 'owner' ? (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Crown className="size-3" /> {t('household.members.owner')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {t('household.members.member')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {isOwner && member.user_id !== user?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setRemovingMemberId(member.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Pending invites */}
      {isOwner && invites.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">{t('household.pendingInvites.title')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('household.pendingInvites.expires', {
                      date: format(new Date(invite.expires_at), "dd 'de' MMM", { locale: ptBR }),
                    })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => cancelInviteMut.mutate(invite.id)}
                >
                  {t('household.pendingInvites.cancel')}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {inviteSuccess && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300">
          {t('household.invite.success', { email: inviteSuccess })}
          <button onClick={() => setInviteSuccess(null)} className="ml-2 underline">
            {t('household.invite.close')}
          </button>
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('household.invite.title')}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={inviteForm.handleSubmit((d) => inviteMut.mutateAsync(d))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>{t('household.invite.email')}</Label>
              <Input
                type="email"
                placeholder={t('household.invite.placeholder')}
                {...inviteForm.register('email')}
              />
              {inviteForm.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {inviteForm.formState.errors.email.message}
                </p>
              )}
            </div>
            {inviteMut.error && (
              <p className="text-xs text-destructive">{t('household.invite.error')}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={inviteMut.isPending}>
                {inviteMut.isPending ? t('household.invite.sending') : t('household.invite.send')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Household Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('household.myHouseholds.createTitle')}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={createHouseholdForm.handleSubmit((d) => createHouseholdMut.mutateAsync(d))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>{t('household.myHouseholds.createName')}</Label>
              <Input {...createHouseholdForm.register('name')} />
              {createHouseholdForm.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {createHouseholdForm.formState.errors.name.message}
                </p>
              )}
            </div>
            {createHouseholdMut.error && (
              <p className="text-xs text-destructive">{t('common.error')}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createHouseholdMut.isPending}>
                {createHouseholdMut.isPending
                  ? t('household.myHouseholds.creating')
                  : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove member confirm */}
      <ConfirmDialog
        open={!!removingMemberId}
        title={t('household.members.removeTitle')}
        description={t('household.members.removeDescription', {
          name: memberToRemove?.full_name ?? 'este membro',
        })}
        confirmLabel={t('household.members.removeButton')}
        variant="destructive"
        onConfirm={async () => {
          if (removingMemberId) await removeMemberMut.mutateAsync(removingMemberId)
          setRemovingMemberId(undefined)
        }}
        onCancel={() => setRemovingMemberId(undefined)}
      />
    </div>
  )
}
