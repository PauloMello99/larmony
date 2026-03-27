import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { AuthTemplate } from '@/components/templates/AuthTemplate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
})

type ForgotForm = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<ForgotForm>({ resolver: zodResolver(schema) })

  async function onSubmit(data: ForgotForm) {
    await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    // Always show success to avoid email enumeration
    setSent(true)
  }

  if (sent) {
    return (
      <AuthTemplate
        title="Verifique seu e-mail"
        description="Enviamos as instruções de redefinição de senha"
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-muted/40 px-6 py-8 text-center">
            <MailCheck className="size-10 text-primary" />
            <div>
              <p className="font-medium text-foreground">E-mail enviado</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Se <strong>{getValues('email')}</strong> estiver cadastrado, você receberá as
                instruções em breve. Verifique também a caixa de spam.
              </p>
            </div>
          </div>
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar para o login
          </Link>
        </div>
      </AuthTemplate>
    )
  }

  return (
    <AuthTemplate
      title="Redefinir senha"
      description="Informe seu e-mail para receber o link de redefinição"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Enviar link de redefinição'}
        </Button>
      </form>

      <Link
        to="/login"
        className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar para o login
      </Link>
    </AuthTemplate>
  )
}
