import type { NotificationType } from "./notification.entity";

// In-app nunca aparece aqui — é sempre gravado, nunca opcional (ver notifications).
export type NotificationChannel = "email" | "sms" | "whatsapp";

export interface NotificationPreferenceProps {
  id: string;
  userId: string;
  eventType: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationPreferenceEntity {
  readonly id: string;
  readonly userId: string;
  readonly eventType: NotificationType;
  readonly channel: NotificationChannel;
  readonly enabled: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: NotificationPreferenceProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.eventType = props.eventType;
    this.channel = props.channel;
    this.enabled = props.enabled;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: NotificationPreferenceProps): NotificationPreferenceEntity {
    return new NotificationPreferenceEntity(props);
  }
}

/** Canais resolvidos para um (usuário, evento) — defaults já aplicados. */
export interface ResolvedChannels {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}
