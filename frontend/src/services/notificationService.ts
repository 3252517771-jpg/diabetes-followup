import { request } from './request'
import type { ApiResponse, PageData } from '../types/common'
import type {
  NotificationItem,
  NotificationListParams,
  NotificationUnreadCount,
} from '../types/notification'

export async function fetchNotifications(params: NotificationListParams) {
  const response = await request.get<ApiResponse<PageData<NotificationItem>>>('/notifications', {
    params,
  })
  return response.data
}

export async function markNotificationRead(notificationId: number) {
  const response = await request.put<ApiResponse<NotificationItem>>(
    `/notifications/${notificationId}/read`,
  )
  return response.data
}

export async function markAllNotificationsRead() {
  const response = await request.put<ApiResponse<{ updated: number }>>('/notifications/read-all')
  return response.data
}

export async function fetchUnreadNotificationCount() {
  const response = await request.get<ApiResponse<NotificationUnreadCount>>(
    '/notifications/unread-count',
  )
  return response.data
}
