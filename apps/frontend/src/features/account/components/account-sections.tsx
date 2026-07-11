"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { TFunction } from "i18next"
import {
  Check,
  KeyRound,
  Languages,
  Loader2,
  MailCheck,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react"
import { Trans, useTranslation } from "react-i18next"
import { useMe } from "@/features/auth"
import { useAuth } from "@/features/auth"
import { clearSession } from "@/features/auth/lib/session"
import { apiRequest } from "@/infrastructure/api/client"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { Switch } from "@/shared/components/ui/switch"
import { Tooltip } from "@/shared/components/ui/tooltip"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  applyLocale,
  type AppLocale,
} from "@/shared/lib/locale"
import {
  useNotificationPreferences,
  type NotificationChannel,
  type NotificationEventType,
} from "../hooks/use-notification-preferences"

function SectionHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-0.5 text-sm text-foreground/50">{description}</p>
    </div>
  )
}

/* ── Perfil ─────────────────────────────────────────────────────── */

const makeProfileSchema = (t: TFunction) =>
  z.object({
    name: z.string().min(1, t("validation.nameRequired")).max(120),
    email: z.string().email(t("validation.invalidEmail")),
  })
type ProfileFormValues = z.infer<ReturnType<typeof makeProfileSchema>>
const MAX_AVATAR_BYTES = 5 * 1024 * 1024

export function ProfileSection() {
  const { t } = useTranslation("account")
  const { me, loading, updateMe, uploadAvatar } = useMe()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const initialized = useRef(false)

  const profileSchema = useMemo(() => makeProfileSchema(t), [t])

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", email: "" },
  })

  useEffect(() => {
    if (me && !initialized.current) {
      initialized.current = true
      form.reset({ name: me.name, email: me.email })
    }
  }, [me, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    setError(null)
    setSaved(false)
    try {
      await updateMe({ name: values.name, email: values.email })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profile.saveError"))
    }
  })

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setAvatarError(null)
    if (!file.type.startsWith("image/")) {
      setAvatarError(t("profile.avatarInvalidType"))
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError(t("profile.avatarTooLarge"))
      return
    }
    setAvatarUploading(true)
    try {
      await uploadAvatar(file)
    } catch (err) {
      setAvatarError(
        err instanceof Error ? err.message : t("profile.avatarUploadError"),
      )
    } finally {
      setAvatarUploading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <SectionHeader
        title={t("profile.title")}
        description={t("profile.description")}
      />
      {loading ? (
        <div className="flex items-center justify-center py-12 text-foreground/40">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t("profile.loading")}
        </div>
      ) : (
        <div className="grid gap-6">
          <div className="flex items-center gap-4">
            {me?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={me.avatarUrl}
                alt={t("profile.avatarAlt")}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-xl font-semibold text-primary">
                {(me?.name ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="grid gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={avatarUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {avatarUploading
                  ? t("profile.avatarUploading")
                  : t("profile.avatarUpload")}
              </Button>
              {avatarError ? (
                <span className="text-xs text-red-400">{avatarError}</span>
              ) : (
                <span className="text-xs text-foreground/30">
                  {t("profile.avatarHint")}
                </span>
              )}
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={handleSubmit} className="grid gap-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("profile.nameLabel")}{" "}
                      <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("profile.emailLabel")}{" "}
                      <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormDescription className="flex items-center gap-1 text-foreground/30">
                      <ShieldCheck className="h-3 w-3" />
                      {t("profile.emailHint")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              {saved && (
                <p className="text-sm text-emerald-400">{t("profile.saved")}</p>
              )}
              <div>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? t("profile.submitting")
                    : t("profile.submit")}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  )
}

/* ── Acesso ─────────────────────────────────────────────────────── */

export function AccessSection() {
  const { t } = useTranslation("account")
  const { user, forgotPassword } = useAuth()
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRequest() {
    if (!user?.email) return
    setLoading(true)
    setError(null)
    try {
      await forgotPassword(user.email)
      setSent(true)
    } catch {
      setError(t("access.error"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <SectionHeader
        title={t("access.title")}
        description={t("access.description")}
      />
      <section className="rounded-xl border border-foreground/[0.07] bg-foreground/[0.03] p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">{t("access.changePassword")}</h3>
        </div>
        {sent ? (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div className="text-sm text-foreground/70">
              <Trans
                t={t}
                i18nKey="access.sentMessage"
                values={{ email: user?.email ?? "" }}
                components={{ strong: <strong /> }}
              />
            </div>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-foreground/50">
              {t("access.explanation")}
            </p>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <div className="mt-4">
              <Button onClick={handleRequest} disabled={loading || !user?.email}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("access.submit")}
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

/* ── Idioma ─────────────────────────────────────────────────────── */

export function LocaleSection() {
  const { t } = useTranslation("common")
  const { t: tAccount } = useTranslation("account")
  const { me, loading, updateMe } = useMe()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(value: string) {
    setError(null)
    setSaving(true)
    try {
      const locale = value as AppLocale
      // Cookie + updateMe({locale}) + reload no mesmo caminho (ver shared/lib/locale.ts).
      await applyLocale(locale, async (l) => {
        await updateMe({ locale: l })
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : tAccount("locale.error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6">
      <SectionHeader
        title={t("locale.label")}
        description={tAccount("locale.description")}
      />
      <section className="rounded-xl border border-foreground/[0.07] bg-foreground/[0.03] p-5">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">{t("locale.label")}</h3>
        </div>
        {loading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-foreground/40">
            <Loader2 className="h-4 w-4 animate-spin" />
            {tAccount("locale.loading")}
          </div>
        ) : (
          <div className="mt-4 max-w-xs">
            <Select
              value={me?.locale ?? DEFAULT_LOCALE}
              onValueChange={handleChange}
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LOCALES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`locale.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          </div>
        )}
      </section>
    </div>
  )
}

/* ── Notificações ───────────────────────────────────────────────── */

const CONFIGURABLE_CHANNELS: NotificationChannel[] = ["email", "sms", "whatsapp"]

export function NotificationsSection() {
  const { t } = useTranslation("account")
  const { matrix, loading, error, updatePreference } = useNotificationPreferences()
  const [pending, setPending] = useState<Set<string>>(new Set())

  async function toggle(
    eventType: NotificationEventType,
    channel: NotificationChannel,
    enabled: boolean,
  ) {
    const key = `${eventType}:${channel}`
    setPending((prev) => new Set(prev).add(key))
    try {
      await updatePreference({ eventType, channel, enabled })
    } finally {
      setPending((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  return (
    <div className="grid gap-6">
      <SectionHeader
        title={t("notifications.title")}
        description={t("notifications.description")}
      />
      {loading ? (
        <div className="flex items-center justify-center py-12 text-foreground/40">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t("notifications.loading")}
        </div>
      ) : error ? (
        <p className="text-sm text-red-400">{t("notifications.error")}</p>
      ) : (
        <section className="rounded-xl border border-foreground/[0.07] bg-foreground/[0.03] p-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("notifications.columns.event")}</TableHead>
                <TableHead className="text-center">{t("notifications.columns.inapp")}</TableHead>
                <TableHead className="text-center">{t("notifications.columns.email")}</TableHead>
                <TableHead className="text-center">{t("notifications.columns.sms")}</TableHead>
                <TableHead className="text-center">
                  {t("notifications.columns.whatsapp")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.map((row) => (
                <TableRow key={row.eventType}>
                  <TableCell className="font-medium">
                    {t(`notifications.events.${row.eventType}`)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Check className="mx-auto h-4 w-4 text-foreground/30" />
                  </TableCell>
                  {CONFIGURABLE_CHANNELS.map((channel) => {
                    // SMS/WhatsApp são ports stub no M11 (ADR-0023) — visíveis,
                    // sempre desabilitados, sem verificação de telefone ainda.
                    const stubbed = channel !== "email"
                    const switchEl = (
                      <Switch
                        checked={stubbed ? false : row[channel]}
                        disabled={stubbed || pending.has(`${row.eventType}:${channel}`)}
                        onCheckedChange={(checked) => void toggle(row.eventType, channel, checked)}
                      />
                    )
                    return (
                      <TableCell key={channel} className="text-center">
                        {stubbed ? (
                          <Tooltip content={t("notifications.columns.stubbedHint")}>
                            <span className="inline-flex">{switchEl}</span>
                          </Tooltip>
                        ) : (
                          switchEl
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </div>
  )
}

/* ── Zona de perigo ─────────────────────────────────────────────── */

export function DangerSection() {
  const { t } = useTranslation("account")
  const router = useRouter()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const email = user?.email ?? ""
  const isConfirmed = confirmation.trim().toLowerCase() === email.toLowerCase()

  async function handleDelete() {
    if (!isConfirmed) return
    setLoading(true)
    setError(null)
    try {
      await apiRequest<void>("/auth/me", { method: "DELETE" })
      clearSession()
      await router.replace("/auth/login")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("danger.deleteError"))
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <SectionHeader
        title={t("danger.title")}
        description={t("danger.description")}
      />
      <section className="rounded-lg border border-red-500/20 p-4 sm:p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-red-400">{t("danger.cardTitle")}</h3>
          <p className="mt-1 text-sm text-foreground/50">
            {t("danger.cardDescription")}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">{t("danger.deleteTitle")}</p>
            <p className="text-xs text-foreground/40">
              {t("danger.deleteHint")}
            </p>
          </div>

          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v)
              if (!v) {
                setConfirmation("")
                setError(null)
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                <Trash2 className="h-4 w-4" />
                {t("danger.deleteButton")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("danger.dialogTitle")}</DialogTitle>
                <DialogDescription>
                  <Trans
                    t={t}
                    i18nKey="danger.dialogDescription"
                    components={{
                      span: <span className="font-semibold text-red-400" />,
                    }}
                  />
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3">
                <Label htmlFor="delete-account-confirm">
                  <Trans
                    t={t}
                    i18nKey="danger.confirmLabel"
                    values={{ email }}
                    components={{
                      span: <span className="font-mono text-foreground/80" />,
                    }}
                  />
                </Label>
                <Input
                  id="delete-account-confirm"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder={email}
                  autoComplete="off"
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
              </div>

              <DialogFooter>
                <Button
                  variant="destructive"
                  disabled={!isConfirmed || loading}
                  onClick={handleDelete}
                  className="w-full sm:w-auto"
                >
                  {loading ? t("danger.deleting") : t("danger.confirmDelete")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </div>
  )
}
