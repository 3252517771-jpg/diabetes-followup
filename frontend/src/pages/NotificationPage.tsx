import { useMemo, useState } from 'react'
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
import {
  BellOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  MessageOutlined,
  RightOutlined,
} from '@ant-design/icons'
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

const notificationTypeMeta = {
  todo: { label: '待办', color: 'processing' },
  notification: { label: '通知', color: 'blue' },
  announcement: { label: '公告', color: 'purple' },
} as const

const notificationStatusMeta = {
  unread: { label: '未读', color: 'gold' },
  read: { label: '已读', color: 'blue' },
  sent: { label: '已发送', color: 'cyan' },
  failed: { label: '发送失败', color: 'red' },
} as const

function formatDateTime(value: string) {
  return value.replace('T', ' ').slice(0, 16)
}

function getChannelLabel(channel: string) {
  if (channel === 'wechat') {
    return '微信通知'
  }
  if (channel === 'system') {
    return '站内消息'
  }
  return channel || '未标记渠道'
}

function getNotificationSummary(item: NotificationItem) {
  if (item.notification_type === 'todo') {
    return '这条消息需要尽快处理，建议优先执行关联动作，再回看正文细节。'
  }
  if (item.fail_reason) {
    return '消息主体已生成，但推送链路出现异常，建议先检查失败原因与目标入口。'
  }
  if (item.notification_type === 'announcement') {
    return '这是一条面向当前用户的系统公告，可先快速浏览摘要，再决定是否进入关联页面。'
  }
  return '这是一条常规业务通知，建议先确认状态，再进入相关页面继续处理。'
}

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
        throw new Error(response.message || '未读数量加载失败')
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

  const selectedTypeMeta = selectedNotification
    ? notificationTypeMeta[selectedNotification.notification_type]
    : null
  const selectedStatusMeta = selectedNotification
    ? notificationStatusMeta[selectedNotification.status]
    : null

  const detailMetaItems = useMemo(() => {
    if (!selectedNotification) {
      return []
    }
    return [
      { label: '发送时间', value: formatDateTime(selectedNotification.sent_at) },
      { label: '通知渠道', value: getChannelLabel(selectedNotification.channel) },
      { label: '接收对象', value: `${selectedNotification.recipient_type} #${selectedNotification.recipient_id}` },
    ]
  }, [selectedNotification])

  return (
    <div className="page-shell">
      <div className="page-toolbar followup-toolbar">
        <div>
          <Typography.Text className="dashboard-kicker">Messages</Typography.Text>
          <Typography.Title level={2} className="panel-title">
            消息中心
          </Typography.Title>
          <Typography.Paragraph className="panel-subtitle">
            待办提醒、审核结果与系统通知统一汇总在这里，页面默认直连真实后端消息接口。
          </Typography.Paragraph>
        </div>
        <Space>
          <Badge count={unreadCount}>
            <Button icon={<BellOutlined />}>未读</Button>
          </Badge>
          <Button
            icon={<CheckOutlined />}
            onClick={() => markAllReadMutation.mutate()}
            loading={markAllReadMutation.isPending}
          >
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
                        <Tag color={notificationTypeMeta[item.notification_type].color}>
                          {notificationTypeMeta[item.notification_type].label}
                        </Tag>
                        {item.fail_reason ? <Tag color="red">推送异常</Tag> : null}
                      </Space>
                      <Typography.Paragraph className="notification-list-item__body">
                        {item.body}
                      </Typography.Paragraph>
                    </div>
                  </Space>
                  <Typography.Text type="secondary">{formatDateTime(item.sent_at)}</Typography.Text>
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
        width={560}
        onClose={() => setSelectedNotification(null)}
      >
        {selectedNotification ? (
          <div className="notification-detail">
            <section className="notification-detail__hero">
              <div className="notification-detail__hero-head">
                <Space wrap>
                  {selectedTypeMeta ? (
                    <Tag color={selectedTypeMeta.color}>{selectedTypeMeta.label}</Tag>
                  ) : null}
                  {selectedStatusMeta ? (
                    <Tag color={selectedStatusMeta.color}>{selectedStatusMeta.label}</Tag>
                  ) : null}
                  {selectedNotification.fail_reason ? <Tag color="red">需检查推送链路</Tag> : null}
                </Space>
                <Typography.Text type="secondary">
                  <ClockCircleOutlined /> {formatDateTime(selectedNotification.sent_at)}
                </Typography.Text>
              </div>

              <Typography.Title level={4} className="notification-detail__title">
                {selectedNotification.title}
              </Typography.Title>
              <Typography.Paragraph className="notification-detail__summary">
                {getNotificationSummary(selectedNotification)}
              </Typography.Paragraph>

              <div className="notification-detail__actions">
                {selectedNotification.action_path ? (
                  <Button
                    type="primary"
                    icon={<RightOutlined />}
                    onClick={() => {
                      navigate(selectedNotification.action_path as string)
                      setSelectedNotification(null)
                    }}
                  >
                    {selectedNotification.action_label || '进入关联页面'}
                  </Button>
                ) : (
                  <Button type="default" disabled icon={<RightOutlined />}>
                    暂无关联页面
                  </Button>
                )}

                {selectedNotification.status === 'unread' ? (
                  <Button
                    icon={<CheckCircleOutlined />}
                    onClick={() => markReadMutation.mutate(selectedNotification.id)}
                    loading={markReadMutation.isPending}
                  >
                    标记已读
                  </Button>
                ) : (
                  <Button disabled icon={<CheckCircleOutlined />}>
                    已处理
                  </Button>
                )}
              </div>
            </section>

            <section className="notification-detail__meta-grid">
              {detailMetaItems.map((metaItem) => (
                <div key={metaItem.label} className="notification-detail__meta-card">
                  <Typography.Text className="notification-detail__meta-label">
                    {metaItem.label}
                  </Typography.Text>
                  <Typography.Text strong>{metaItem.value}</Typography.Text>
                </div>
              ))}
            </section>

            <section className="notification-detail__body-card">
              <div className="notification-detail__section-head">
                <MessageOutlined />
                <Typography.Text strong>消息正文</Typography.Text>
              </div>
              <Typography.Paragraph className="notification-detail__body-text">
                {selectedNotification.body}
              </Typography.Paragraph>
            </section>

            {selectedNotification.fail_reason ? (
              <section className="notification-detail__error-card">
                <div className="notification-detail__section-head notification-detail__section-head--danger">
                  <ExclamationCircleOutlined />
                  <Typography.Text strong>推送失败原因</Typography.Text>
                </div>
                <Typography.Paragraph className="notification-detail__body-text notification-detail__body-text--danger">
                  {selectedNotification.fail_reason}
                </Typography.Paragraph>
              </section>
            ) : null}
          </div>
        ) : (
          <EmptyMotion description="未选择消息" />
        )}
      </Drawer>
    </div>
  )
}
