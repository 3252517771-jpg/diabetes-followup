import { useQuery } from '@tanstack/react-query'
import { Button, Empty, Space, Tag, Timeline, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'

import { EmptyMotion } from '../../components/reactbits/EmptyMotion'
import { ROUTE_PATHS } from '../../config/routes'
import { fetchDietRecommendations } from '../../services/dietService'
import type { DietRecommendation } from '../../types/diet'

interface PatientDietPanelProps {
  patientId: number
}

const reviewStatusColorMap = {
  pending: 'gold',
  approved: 'blue',
  rejected: 'red',
} as const

const reviewStatusLabelMap = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
} as const

const pushStatusLabelMap = {
  unpushed: '未推送',
  pushed: '已推送',
  failed: '推送失败',
} as const

function buildTimelineEvents(item: DietRecommendation) {
  const events = [
    {
      key: `${item.id}-created`,
      color: 'blue',
      title: '已生成推荐',
      time: item.created_at,
      summary: `总热量 ${item.content.total_calories} kcal`,
      note: item.content.notes || '已生成本次饮食建议，等待进一步处理。',
    },
  ]

  if (item.review_status !== 'pending') {
    events.push({
      key: `${item.id}-reviewed`,
      color: item.review_status === 'approved' ? 'green' : 'red',
      title: item.review_status === 'approved' ? '审核通过' : '审核驳回',
      time: item.reviewed_at ?? item.created_at,
      summary: item.reviewer_name ? `审核人：${item.reviewer_name}` : '已完成审核',
      note: item.review_comment?.trim() || '暂无审核备注',
    })
  } else {
    events.push({
      key: `${item.id}-pending`,
      color: 'gold',
      title: '等待审核',
      time: item.created_at,
      summary: '当前仍在待审核队列中',
      note: '建议先结合上方血糖趋势与近期记录再做判断。',
    })
  }

  if (item.push_status === 'pushed') {
    events.push({
      key: `${item.id}-pushed`,
      color: 'green',
      title: '已推送给患者',
      time: item.reviewed_at ?? item.created_at,
      summary: item.push_target_label,
      note: '推荐内容已进入患者触达链路。',
    })
  } else if (item.push_status === 'failed') {
    events.push({
      key: `${item.id}-push-failed`,
      color: 'red',
      title: '推送失败',
      time: item.reviewed_at ?? item.created_at,
      summary: item.push_target_label,
      note: '请到饮食推荐管理页查看失败原因并重试。',
    })
  }

  return events
}

export function PatientDietPanel({ patientId }: PatientDietPanelProps) {
  const navigate = useNavigate()
  const recommendationsQuery = useQuery({
    queryKey: ['patient-diet', patientId],
    queryFn: async () => {
      const response = await fetchDietRecommendations({
        page: 1,
        size: 10,
        patient_id: patientId,
      })
      if (!response.data) {
        throw new Error(response.message || '饮食推荐加载失败')
      }
      return response.data
    },
  })

  if (recommendationsQuery.isLoading) {
    return <div className="patient-diet-timeline patient-diet-timeline--loading" />
  }

  const items = recommendationsQuery.data?.items ?? []

  return (
    <div className="patient-diet-timeline">
      <div className="patient-diet-timeline__header">
        <div>
          <Typography.Text className="dashboard-kicker">Diet Timeline</Typography.Text>
          <Typography.Title level={3} className="panel-title">
            饮食推荐
          </Typography.Title>
          <Typography.Paragraph className="panel-subtitle">
            按时间查看生成、审核与推送过程，把干预动作放到工作流尾段收口。
          </Typography.Paragraph>
        </div>
        <Button onClick={() => navigate(`${ROUTE_PATHS.dietManage}?patientId=${patientId}`)}>
          查看全部
        </Button>
      </div>

      {!items.length ? (
        <EmptyMotion description="该患者暂无饮食推荐记录" />
      ) : (
        <Space direction="vertical" size={18} style={{ width: '100%' }}>
          {items.map((item) => (
            <div key={item.id} className="patient-diet-timeline__entry">
              <div className="patient-diet-timeline__entry-meta">
                <Space wrap size={[8, 8]}>
                  <Tag color={reviewStatusColorMap[item.review_status]}>
                    {reviewStatusLabelMap[item.review_status]}
                  </Tag>
                  <Tag>{pushStatusLabelMap[item.push_status]}</Tag>
                  <Tag>{item.generate_method}</Tag>
                </Space>
                <Typography.Text type="secondary">
                  {item.created_at.replace('T', ' ').slice(0, 16)}
                </Typography.Text>
              </div>

              <Timeline
                items={buildTimelineEvents(item).map((event) => ({
                  color: event.color,
                  children: (
                    <div className="patient-diet-timeline__event">
                      <Typography.Text strong>{event.title}</Typography.Text>
                      <div className="patient-diet-timeline__event-time">
                        {event.time.replace('T', ' ').slice(0, 16)}
                      </div>
                      <Typography.Paragraph className="patient-diet-timeline__event-summary">
                        {event.summary}
                      </Typography.Paragraph>
                      <Typography.Paragraph className="patient-diet-timeline__event-note">
                        {event.note}
                      </Typography.Paragraph>
                    </div>
                  ),
                }))}
              />

              <div className="patient-diet-timeline__meals">
                {item.content.meals.length ? (
                  item.content.meals.map((meal) => (
                    <Tag key={`${item.id}-${meal.meal_type}`}>{meal.meal_type}</Tag>
                  ))
                ) : (
                  <Empty description="暂无餐次拆分" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </div>
            </div>
          ))}
        </Space>
      )}
    </div>
  )
}
