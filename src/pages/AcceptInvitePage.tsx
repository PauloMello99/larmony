import { useEffect, useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { LogIn, UserPlus, Home } from 'lucide-react'
import { Route } from '@/routes/accept-invite'
import { supabase } from '@/services/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Status = 'checking' | 'unauthenticated' | 'loading' | 'success' | 'error'

export default function AcceptInvitePage() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>(!token ? 'error' : 'checking')
  const [message, setMessage] = useState(!token ? 'Token de convite inválido.' : '')

  const redirectParam = token ? `/accept-invite?token=${token}` : undefined

  useEffect(() => {
    if (!token) return

    async function checkAndAccept() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setStatus('unauthenticated')
        return
      }

      setStatus('loading')

      const { data: invite, error } = await supabase
        .from('household_invites')
        .select('*')
        .eq('token', token!)
        .is('accepted_at', null)
        .gte('expires_at', new Date().toISOString())
        .single()

      if (error || !invite) {
        setStatus('error')
        setMessage('Convite inválido ou expirado.')
        return
      }

      const { error: memberError } = await supabase
        .from('household_memberships')
        .insert({ household_id: invite.household_id, user_id: session.user.id })

      if (memberError && memberError.code !== '23505') {
        setStatus('error')
        setMessage('Erro ao aceitar o convite.')
        return
      }

      await supabase
        .from('household_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id)

      setStatus('success')
      setTimeout(() => navigate({ to: '/' }), 2000)
    }

    checkAndAccept()
  }, [token, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Home className="size-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Convite para lar</CardTitle>
        </CardHeader>

        <CardContent className="text-center">
          {status === 'checking' && (
            <CardDescription>Verificando convite...</CardDescription>
          )}

          {status === 'loading' && (
            <CardDescription>Processando convite...</CardDescription>
          )}

          {status === 'success' && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-600">
                Convite aceito com sucesso!
              </p>
              <p className="text-sm text-muted-foreground">Redirecionando para o dashboard...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <p className="text-sm text-destructive">{message}</p>
              <Button asChild variant="outline" size="sm">
                <Link to="/login">Ir para o login</Link>
              </Button>
            </div>
          )}

          {status === 'unauthenticated' && (
            <div className="space-y-4">
              <CardDescription>
                Você foi convidado para um lar. Entre ou crie uma conta para aceitar o convite.
              </CardDescription>
              <div className="flex flex-col gap-2">
                <Button asChild>
                  <Link to="/login" search={{ redirect: redirectParam }}>
                    <LogIn className="mr-2 size-4" />
                    Entrar com conta existente
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/register" search={{ redirect: redirectParam }}>
                    <UserPlus className="mr-2 size-4" />
                    Criar nova conta
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
