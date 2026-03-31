import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { Route } from '@/routes/login'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, CheckCircle } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { AuthTemplate } from '@/components/templates/AuthTemplate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

type LoginForm = z.infer<typeof loginSchema>

type AlertState =
  | { type: 'error'; message: string }
  | { type: 'unconfirmed'; email: string }
  | { type: 'resent' }
  | null

export default function LoginPage() {
  const navigate = useNavigate()
  const { redirect: redirectTo } = Route.useSearch()
  const [showPassword, setShowPassword] = useState(false)
  const [alert, setAlert] = useState<AlertState>(null)
  const [resending, setResending] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginForm) {
    setAlert(null)
    const { error } = await supabase.auth.signInWithPassword(data)
    if (error) {
      if (
        error.message.toLowerCase().includes('email not confirmed') ||
        error.message.toLowerCase().includes('not confirmed')
      ) {
        setAlert({ type: 'unconfirmed', email: data.email })
      } else {
        setAlert({ type: 'error', message: 'E-mail ou senha incorretos.' })
      }
      return
    }

    const { data: session } = await supabase.auth.getUser()
    if (!session.user) return

    const { data: membership } = await supabase
      .from('household_memberships')
      .select('household_id')
      .eq('user_id', session.user.id)
      .limit(1)
      .single()

    if (redirectTo) {
      const parsed = new URL(redirectTo, window.location.origin)
      const searchParams = Object.fromEntries(parsed.searchParams)
      navigate({
        to: parsed.pathname as '/',
        ...(Object.keys(searchParams).length > 0 ? { search: searchParams } : {}),
      })
    } else {
      navigate({ to: membership ? '/' : '/setup' })
    }
  }

  async function resendConfirmation() {
    const email = getValues('email')
    if (!email) return
    setResending(true)
    await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
    setAlert({ type: 'resent' })
  }

  // async function signInWithGoogle() {
  //   await supabase.auth.signInWithOAuth({
  //     provider: 'google',
  //     options: { redirectTo: `${window.location.origin}/` },
  //   })
  // }

  // async function signInWithApple() {
  //   await supabase.auth.signInWithOAuth({
  //     provider: 'apple',
  //     options: { redirectTo: `${window.location.origin}/` },
  //   })
  // }

  return (
    <AuthTemplate title="Bem-vindo de volta" description="Entre com sua conta para continuar">
      {/* <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" className="w-full" onClick={signInWithGoogle}>
            <svg className="mr-2 size-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={signInWithApple}>
            <svg className="mr-2 size-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
            </svg>
            Apple
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">ou entre com e-mail</span>
          </div>
        </div>
      </div> */}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            {...register('email')}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link
              to="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className="pr-10"
              {...register('password')}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        {/* Alerts */}
        {alert?.type === 'error' && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {alert.message}
          </div>
        )}

        {alert?.type === 'unconfirmed' && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-800 dark:bg-amber-950/30">
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Confirme seu e-mail
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Enviamos um link de confirmação para <strong>{alert.email}</strong>. Verifique sua
                  caixa de entrada (e spam).
                </p>
                <button
                  type="button"
                  className="text-xs font-medium text-amber-700 underline hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
                  onClick={resendConfirmation}
                  disabled={resending}
                >
                  {resending ? 'Reenviando...' : 'Reenviar e-mail de confirmação'}
                </button>
              </div>
            </div>
          </div>
        )}

        {alert?.type === 'resent' && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-300">
            <CheckCircle className="size-4" />
            E-mail de confirmação reenviado com sucesso!
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Não tem uma conta?{' '}
        <Link
          to="/register"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Cadastre-se
        </Link>
      </p>
    </AuthTemplate>
  )
}
