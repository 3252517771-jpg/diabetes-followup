import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App,
  Badge,
  Button,
  Card,
  Drawer,
  Empty,
  List,
  Segmented,
  Space,
  Tag,
  Typography,
} from 'antd'
import { BellOutlined, CheckOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

import { QueryStateAlert } from '../components/QueryStateAlert'
import { EmptyMotion } from '../components/reactbits/EmptyMotion'
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService'
import type { NotificationItem } from '../types/notification'

const notificationTypeLabel = {
  todo: '待办',
  notification: '通知',
  announcement: '公告',
} as const

export function NotificationPage() {
  const [typeFilter, setTypeFilter] = useState<'todo' | 'notification' | 'announcement'>('todo')
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null)
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const notificationsQuery = useQuery({
    queryKey: ['notifications', typeFilter],
    queryFn: async () => {
      const response = await fetchNotifications({ page: 1, size: 50, type: typeFilter })
      if (!response.data) {
        throw new Error(response.message || '消息加载失败')
      }
      return response.data
    },
  })

  const unreadCountQuery = useQuery({
    queryKey: ['notification-unread-count'],
    queryFn: async () => {
      const response = await fetchUnreadNotificationCount()
      if (!response.data) {
        throw new Error(response.message || '未读数加载失败')
      }
      return response.data
    },
  })

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async (response) => {
      if (selectedNotification?.id === response.data?.id && response.data) {
        setSelectedNotification(response.data)
      }
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
      await queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] })
    },
    onError: (error: Error) => {
      message.error(error.message)
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async (response) => {
      message.success(`已标记 ${response.data?.updated ?? 0} 条消息为已读`)
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
      await queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] })
    },
    onError: (error: Error) => {
      message.error(error.message)
    },
  })

  const items = notificationsQuery.data?.items ?? []
  const unreadCount = unreadCountQuery.data?.unread_count ?? 0
  const unreadItems = items.filter((item) => item.status === 'unread').length

  return (
    <div className="page-shell">
      <div className="page-toolbar followup-toolbar">
        <div>
          <Typography.Text className="dashboard-kicker">Messages</Typography.Text>
          <Typography.Title level={2} className="panel-title">
            消息中心
          </Typography.Title>
          <Typography.Paragraph className="panel-subtitle">
            待审核推荐、审核结果与系统通知统一在这里汇总，均来自真实后端消息接口。
          </Typography.Paragraph>
        </div>
        <Space>
          <Badge count={unreadCount}>
            <Button icon={<BellOutlined />}>未读</Button>
          </Badge>
          <Button icon={<CheckOutlined />} onClick={() => markAllReadMutation.mutate()}>
            全部已读
          </Button>
        </Space>
      </div>

      <Card className="panel-card">
        <div className="notification-filter-row">
          <Segmented
            value={typeFilter}
            options={[
              { label: '待办', value: 'todo' },
              { label: '通知', value: 'notification' },
              { label: '公告', value: 'announcement' },
            ]}
            onChange={(value) => setTypeFilter(value as 'todo' | 'notification' | 'announcement')}
          />
          <Typography.Text type="secondary">当前列表未读 {unreadItems} 条</Typography.Text>
        </div>

        {notificationsQuery.isError || unreadCountQuery.isError ? (
          <QueryStateAlert
            title="消息中心加载失败"
            description={
              notificationsQuery.error?.message ??
              unreadCountQuery.error?.message ??
              '请稍后重试'
            }
            onRetry={() => {
              void notificationsQuery.refetch()
              void unreadCountQuery.refetch()
            }}
          />
        ) : null}

        {!notificationsQuery.isError && items.length ? (
          <List
            dataSource={items}
            renderItem={(item) => (
              <List.Item
                className="notification-list-item"
                onClick={() => setSelectedNotification(item)}
                style={{ cursor: 'pointer' }}
              >
                <div className="notification-list-item__content">
                  <Space size={12} align="start">
                    <Badge dot={item.status === 'unread'}>
                      <div className="notification-list-item__icon">
                        <BellOutlined />
                      </div>
                    </Badge>
                    <div>
                      <Space wrap>
                        <Typography.Text strong>{item.title}</Typography.Text>
                        <Tag>{notificationTypeLabel[item.notification_type]}</Tag>
                        {item.fail_reason ? <Tag color="red">推送异常</Tag> : null}
                      </Space>
                      <Typography.Paragraph className="notification-list-item__body">
                        {item.body}
                      </Typography.Paragraph>
                    </div>
                  </Space>
                  <Typography.Text type="secondary">
                    {item.sent_at.replace('T', ' ').slice(0, 16)}
                  </Typography.Text>
                </div>
              </List.Item>
            )}
            locale={{ emptyText: <Empty description="暂无消息" /> }}
          />
        ) : !notificationsQuery.isError ? (
          <EmptyMotion description={notificationsQuery.isLoading ? '消息加载中' : '当前分类暂无消息'} />
        ) : null}
      </Card>

      <Drawer
        title="消息详情"
        open={selectedNotification !== null}
        width={520}
        onClose={() => setSelectedNotification(null)}
      >
        {selectedNotification ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space wrap>
              <Tag>{notificationTypeLabel[selectedNotification.notification_type]}</Tag>
              <Tag color={selectedNotification.status === 'unread' ? 'gold' : 'blue'}>
                {selectedNotification.status === 'unread' ? '未读' : '已读'}
              </Tag>
            </Space>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {selectedNotification.title}
            </Typography.Title>
            <Typography.Paragraph>{selectedNotification.body}</Typography.Paragraph>
            {selectedNotification.fail_reason ? (
              <Typography.Text type="danger">
                推送异常：{selectedNotification.fail_reason}
              </Typography.Text>
            ) : null}
            <Space>
              {selectedNotification.action_path ? (
                <Button
                  type="primary"
                  onClick={() => {
                    navigate(selectedNotification.action_path as string)
                    setSelectedNotification(null)
                  }}
                >
                  {selectedNotification.action_label || '查看关联页面'}
                </Button>
              ) : null}
              {selectedNotification.status === 'unread' ? (
                <Button
                  onClick={() => markReadMutation.mutate(selectedNotification.id)}
                  loading={markReadMutation.isPending}
                >
                  标记已读
                </Button>
              ) : null}
            </Space>
          </Space>
        ) : (
          <EmptyMotion description="未选择消息" />
        )}
      </Drawer>
    </div>
  )
}
