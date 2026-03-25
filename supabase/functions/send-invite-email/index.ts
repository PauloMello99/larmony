import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from '../_shared/resend.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Init Supabase with service role to bypass RLS for insert
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Init Supabase with user JWT to validate caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { household_id, email } = await req.json()

    if (!household_id || !email) {
      return new Response(JSON.stringify({ error: 'household_id and email are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate caller is owner of the household
    const { data: membership } = await supabaseAdmin
      .from('household_memberships')
      .select('role')
      .eq('household_id', household_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'owner') {
      return new Response(
        JSON.stringify({ error: 'Only the household owner can invite members' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Fetch household name
    const { data: household } = await supabaseAdmin
      .from('households')
      .select('name')
      .eq('id', household_id)
      .single()

    // Fetch inviter profile
    const { data: inviterProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    // Create invite record
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('household_invites')
      .insert({
        household_id,
        email,
        invited_by: user.id,
      })
      .select()
      .single()

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
    const acceptUrl = `${appUrl}/accept-invite?token=${invite.token}`
    const householdName = household?.name ?? 'um lar'
    const inviterName = inviterProfile?.full_name ?? 'Alguém'

    await sendEmail({
      to: email,
      subject: `${householdName} — Você foi convidado(a)`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Você foi convidado(a) para um lar!</h2>
          <p><strong>${inviterName}</strong> convidou você para participar do lar <strong>${householdName}</strong> no Home Finances.</p>
          <p>Clique no botão abaixo para aceitar o convite:</p>
          <a href="${acceptUrl}" style="display:inline-block;background:#18181b;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">
            Aceitar convite
          </a>
          <p style="color:#71717a;font-size:12px;">Este link expira em 7 dias. Se você não esperava este convite, pode ignorar este e-mail.</p>
          <p style="color:#71717a;font-size:12px;">Ou copie este link: ${acceptUrl}</p>
        </div>
      `,
    })

    return new Response(JSON.stringify({ token: invite.token }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
