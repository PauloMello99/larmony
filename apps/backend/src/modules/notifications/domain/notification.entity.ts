// Event key único, reusado por inbox in-app + preferências + dispatcher (M11)
// — espelha o enum `notification_type` do schema.
export type NotificationType =
  | "bill_reminder"
  | "invite_accepted"
  | "goal_reached"
  | "auto_launch"
  | "budget_exceeded"
  | "monthly_report"
  | "support_ticket_created"
  | "support_reply";

export interface NotificationProps {
  id: string;
  userId: string;
  householdId: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface CreateNotificationData {
  userId: string;
  householdId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
}

export class NotificationEntity {
  readonly id: string;
  readonly userId: string;
  readonly householdId: string | null;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string | null;
  readonly data: Record<string, unknown> | null;
  readonly readAt: Date | null;
  readonly createdAt: Date;

  private constructor(props: NotificationProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.householdId = props.householdId;
    this.type = props.type;
    this.title = props.title;
    this.body = props.body;
    this.data = props.data;
    this.readAt = props.readAt;
    this.createdAt = props.createdAt;
  }

  static create(props: NotificationProps): NotificationEntity {
    return new NotificationEntity(props);
  }
}
