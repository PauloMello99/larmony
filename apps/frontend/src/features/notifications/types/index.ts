export type NotificationType = "bill_reminder" | "invite_accepted" | "goal_reached"

export interface AppNotification {
  id: string
  userId: string
  householdId: string | null
  type: NotificationType
  title: string
  body: string | null
  data: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
}

export interface NotificationsResponse {
  items: AppNotification[]
  unread: number
}
