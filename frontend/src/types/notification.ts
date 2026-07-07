import type { PageParams } from './common'

export interface NotificationItem {
  id: number
  title: string
  body: string
  notification_type: 'todo' | 'notification' | 'announcement'
  channel: string
  status: 'unread' | 'read' | 'sent' | 'failed'
  recipient_type: string
  recipient_id: number
  action_label: string | null
  action_path: string | null
  fail_reason: string | null
  sent_at: string
}

export interface NotificationListParams extends PageParams {
  type?: 'todo' | 'notification' | 'announcement'
}

export interface NotificationUnreadCount {
  unread_count: number
}
