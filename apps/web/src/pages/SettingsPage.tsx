import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, User, Shield, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual obrigatória'),
    newPassword: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Deve conter uma letra maiúscula')
      .regex(/[0-9]/, 'Deve conter um número'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Senhas não coincidem',
    path: ['confirmPassword'],
  })

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>
type SectionId = 'profile' | 'security' | 'language'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { profile, refreshProfile, user, setLocale } = useAuth()
  const [activeSection, setActiveSection] = useState<SectionId>('profile')
  const [languageSuccess, setLanguageSuccess] = useState(false)

  const sections: { id: SectionId; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: t('settings.sections.profile'), icon: User },
    { id: 'security', label: t('settings.sections.security'), icon: Shield },
    { id: 'language', label: t('settings.sections.language'), icon: Languages },
  ]
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  async function onChangeLanguage(locale: string) {
    await setLocale(locale)
    setLanguageSuccess(true)
    setTimeout(() => setLanguageSuccess(false), 3000)
  }

  const initials =
    profile?.full_name
      ?.split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase() ?? '?'

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: profile?.full_name ?? '' },
  })

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  async function onSaveProfile(data: ProfileForm) {
    if (!user) return
    await supabase.from('profiles').update({ full_name: data.full_name }).eq('id', user.id)
    await refreshProfile()
    setProfileSuccess(true)
    setTimeout(() => setProfileSuccess(false), 3000)
  }

  async function onChangePassword(data: PasswordForm) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: data.currentPassword,
    })
    if (signInError) {
      passwordForm.setError('currentPassword', { message: 'Senha atual incorreta' })
      return
    }
    const { error } = await supabase.auth.updateUser({ password: data.newPassword })
    if (error) {
      passwordForm.setError('newPassword', { message: error.message })
      return
    }
    passwordForm.reset()
    setPasswordSuccess(true)
    setTimeout(() => setPasswordSuccess(false), 3000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <div className="flex gap-8">
        <nav className="w-44 shrink-0 space-y-1">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeSection === id
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="flex-1 max-w-lg">
          {activeSection === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Perfil</CardTitle>
                <CardDescription>Atualize seu nome e informações pessoais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="size-16">
                    <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{profile?.full_name ?? 'Usuário'}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <Separator />
                <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome completo</Label>
                    <Input id="full_name" {...profileForm.register('full_name')} />
                    {profileForm.formState.errors.full_name && (
                      <p className="text-xs text-destructive">
                        {profileForm.formState.errors.full_name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input value={user?.email ?? ''} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado.</p>
                  </div>
                  {profileSuccess && (
                    <p className="text-sm text-green-600">Perfil atualizado com sucesso!</p>
                  )}
                  <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                    {profileForm.formState.isSubmitting ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {activeSection === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Segurança</CardTitle>
                <CardDescription>Altere sua senha de acesso</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Senha atual</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrent ? 'text' : 'password'}
                        className="pr-10"
                        {...passwordForm.register('currentPassword')}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowCurrent((v) => !v)}
                        tabIndex={-1}
                      >
                        {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {passwordForm.formState.errors.currentPassword && (
                      <p className="text-xs text-destructive">
                        {passwordForm.formState.errors.currentPassword.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova senha</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNew ? 'text' : 'password'}
                        className="pr-10"
                        {...passwordForm.register('newPassword')}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowNew((v) => !v)}
                        tabIndex={-1}
                      >
                        {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-xs text-destructive">
                        {passwordForm.formState.errors.newPassword.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...passwordForm.register('confirmPassword')}
                    />
                    {passwordForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-destructive">
                        {passwordForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                  {passwordSuccess && (
                    <p className="text-sm text-green-600">Senha alterada com sucesso!</p>
                  )}
                  <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                    {passwordForm.formState.isSubmitting ? 'Alterando...' : 'Alterar senha'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {activeSection === 'language' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.language.title')}</CardTitle>
                <CardDescription>{t('settings.language.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('settings.language.label')}</Label>
                  <Select
                    value={profile?.locale ?? 'pt-BR'}
                    onValueChange={onChangeLanguage}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">{t('settings.language.ptBR')}</SelectItem>
                      <SelectItem value="en">{t('settings.language.en')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {languageSuccess && (
                  <p className="text-sm text-green-600">{t('settings.language.saveSuccess')}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
