import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Home, ArrowRight, Users } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { LarmonyLogo } from '@/components/atoms/Logo'

const setupSchema = z.object({
  householdName: z
    .string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(60, 'Nome muito longo'),
})

type SetupForm = z.infer<typeof setupSchema>

export default function SetupPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupForm>({
    resolver: zodResolver(setupSchema),
    defaultValues: { householdName: 'Nossa Casa' },
  })

  async function onSubmit(data: SetupForm) {
    setServerError(null)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      navigate({ to: '/login' })
      return
    }

    const { error } = await supabase.from('households').insert({
      name: data.householdName,
      owner_id: user.id,
    })

    if (error) {
      setServerError('Não foi possível criar o lar. Tente novamente.')
      return
    }

    navigate({ to: '/' })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      {/* Logo */}
      <div className="mb-10">
        <LarmonyLogo variant="full" />
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          1
        </span>
        <span className="text-foreground font-medium">Criar seu lar</span>
        <span className="mx-2 text-muted-foreground/40">→</span>
        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          2
        </span>
        <span>Dashboard</span>
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Configure seu lar</h1>
          <p className="text-sm text-muted-foreground">
            Crie o grupo financeiro do seu lar. Você poderá convidar outras pessoas depois.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="householdName">Nome do lar</Label>
            <div className="relative">
              <Home className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="householdName"
                className="pl-9"
                placeholder="ex: Nossa Casa, Família Silva..."
                {...register('householdName')}
              />
            </div>
            {errors.householdName ? (
              <p className="text-xs text-destructive">{errors.householdName.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Você pode alterar esse nome nas configurações.
              </p>
            )}
          </div>

          {serverError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              'Criando...'
            ) : (
              <span className="flex items-center gap-2">
                Criar lar e continuar
                <ArrowRight className="size-4" />
              </span>
            )}
          </Button>
        </form>

        {/* What's included card */}
        <Card className="border-dashed">
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">O que está incluído</p>
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  <li>• 13 categorias padrão criadas automaticamente</li>
                  <li>• Controle de entradas e saídas</li>
                  <li>• Orçamentos, metas e contas a pagar</li>
                  <li>• Convide membros do lar depois</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
