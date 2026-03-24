import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Route } from '@/routes/accept-invite'
import { supabase } from '@/services/supabase'

export default function AcceptInvitePage() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token de convite inválido.')
      return
    }

    async function acceptInvite() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate({ to: '/login' })
        return
      }

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

    acceptInvite()
  }, [token, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        {status === 'loading' && <p className="text-muted-foreground">Processando convite...</p>}
        {status === 'success' && <p className="text-green-600">Convite aceito! Redirecionando...</p>}
        {status === 'error' && <p className="text-destructive">{message}</p>}
      </div>
    </div>
  )
}
