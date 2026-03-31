import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { SupabaseService } from '../../../infra/supabase/supabase.service'

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const authHeader = request.headers['authorization'] as string | undefined

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException()
    }

    const token = authHeader.slice(7)
    request.supabase = this.supabaseService.getClientForUser(token)
    return true
  }
}
