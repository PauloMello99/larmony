import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

@Injectable()
export class ProcessorSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const provided = req.headers["x-processor-secret"];
    const expected = this.config.get<string>("PROCESSOR_SHARED_SECRET");
    if (!expected || !provided || provided !== expected) {
      throw new UnauthorizedException("Invalid processor secret");
    }
    return true;
  }
}
