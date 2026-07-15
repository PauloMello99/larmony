import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { IWhatsAppSender, SendWhatsAppInput } from "../domain/ports/whatsapp-sender.port";

/**
 * Stub de WhatsApp (M11 — sem provedor integrado; WhatsApp Business API exige
 * aprovação de template pela Meta, 2–4 semanas de onboarding). Mesma postura
 * do `NoopSmsSender`: flag off por padrão; ligá-la sem provedor é erro de
 * configuração — falha explicitamente.
 */
@Injectable()
export class NoopWhatsAppSender implements IWhatsAppSender {
  private readonly logger = new Logger(NoopWhatsAppSender.name);
  private readonly enabled: boolean;

  constructor(config: ConfigService) {
    this.enabled = config.get<string>("NOTIFICATIONS_WHATSAPP_ENABLED") === "true";
  }

  async send(input: SendWhatsAppInput): Promise<boolean> {
    if (!this.enabled) {
      this.logger.debug(`WhatsApp desabilitado — no-op para ${input.to}`);
      return false;
    }
    throw new Error(
      "NOTIFICATIONS_WHATSAPP_ENABLED=true mas nenhum provedor WhatsApp está integrado (M11 é stub-only).",
    );
  }
}
