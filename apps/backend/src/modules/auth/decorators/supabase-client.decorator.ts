import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export const ReqSupabase = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SupabaseClient => {
    const request = ctx.switchToHttp().getRequest()
    return request.supabase
  }
)
