import { createFileRoute } from '@tanstack/react-router'
import AcceptInvitePage from '@/pages/AcceptInvitePage'
import { z } from 'zod'

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/accept-invite')({
  validateSearch: searchSchema,
  component: AcceptInvitePage,
})
