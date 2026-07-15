import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ISmsSender, SendSmsInput } from "../domain/ports/sms-sender.port";

/**
 * Stub de SMS (M11 — sem provedor integrado; candidato futuro: Twilio).
 * `NOTIFICATIONS_SMS_ENABLED` fica sempre off até a integração real existir;
 * ligá-la sem provedor é erro de configuração — falha alto e explicitamente
 * em vez de fingir enviar.
 */
@Injectable()
export class NoopSmsSender implements ISmsSender {
  private readonly logger = new Logger(NoopSmsSender.name);
  private readonly enabled: boolean;

  constructor(config: ConfigService) {
    this.enabled = config.get<string>("NOTIFICATIONS_SMS_ENABLED") === "true";
  }

  async send(input: SendSmsInput): Promise<boolean> {
    if (!this.enabled) {
      this.logger.debug(`SMS desabilitado — no-op para ${input.to}`);
      return false;
    }
    throw new Error(
      "NOTIFICATIONS_SMS_ENABLED=true mas nenhum provedor SMS está integrado (M11 é stub-only).",
    );
  }
}
