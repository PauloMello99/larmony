import type { NotificationType } from "./notification.entity";
import type { NotificationChannel } from "./notification-preference.entity";

/**
 * Eventos configuráveis na matriz de preferências (M11). `invite_accepted`
 * fica de fora de propósito — é um aviso in-app pontual da plataforma, não um
 * evento financeiro recorrente que o usuário precise sintonizar por canal.
 */
export const PREFERENCE_EVENT_TYPES: NotificationType[] = [
  "bill_reminder",
  "goal_reached",
  "budget_exceeded",
  "auto_launch",
  "monthly_report",
];

/** Default aplicado quando não há linha explícita em `notification_preferences`. */
export const DEFAULT_CHANNEL_ENABLED: Record<NotificationChannel, boolean> = {
  email: true,
  sms: false,
  whatsapp: false,
};
