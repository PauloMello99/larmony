"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/router"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Loader2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { AuthLayout } from "@/features/auth/components/auth-layout"
import {
  makeLoginSchema,
  type LoginFormValues,
} from "@/features/auth/schemas/auth.schemas"

function queryParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : ""
}

export function LoginForm() {
  const { t } = useTranslation("auth")
  const { signIn } = useAuth()
  const router = useRouter()
  const inviteToken = queryParam(router.query.invite)
  const invitedEmail = queryParam(router.query.email)
  const loginSchema = React.useMemo(() => makeLoginSchema(t), [t])

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  // Prefill do e-mail quando vier de um convite (router.query só fica pronto após hidratação).
  React.useEffect(() => {
    if (invitedEmail) reset({ email: invitedEmail, password: "" })
  }, [invitedEmail, reset])

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await signIn(data.email, data.password)
      await router.push(
        inviteToken
          ? `/invite/accept?token=${encodeURIComponent(inviteToken)}`
          : "/households",
      )
    } catch {
      setError("root", { message: t("login.invalidCredentials") })
    }
  }

  const signupHref = inviteToken
    ? `/auth/signup?invite=${encodeURIComponent(inviteToken)}${invitedEmail ? `&email=${encodeURIComponent(invitedEmail)}` : ""}`
    : "/auth/signup"

  return (
    <AuthLayout>
      <Card className="w-full max-w-sm border-foreground/5 bg-foreground/[0.03]">
        <CardHeader className="text-center">
          <div className="mb-2 text-xl font-bold">
            <span className="text-primary">lar</span>mony
          </div>
          <CardTitle className="text-xl">{t("login.title")}</CardTitle>
          <CardDescription className="text-foreground/40">
            {t("login.subtitle")}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {errors.root && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errors.root.message}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">{t("login.emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("login.emailPlaceholder")}
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("login.passwordLabel")}</Label>
                <Link
                  href="/auth/recover"
                  className="text-xs text-foreground/40 hover:text-foreground"
                >
                  {t("login.forgotPassword")}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("login.submit")}
            </Button>
            <p className="text-center text-sm text-foreground/40">
              {t("login.noAccount")}{" "}
              <Link
                href={signupHref}
                className="text-primary hover:text-orange-300"
              >
                {t("login.createAccount")}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </AuthLayout>
  )
}
