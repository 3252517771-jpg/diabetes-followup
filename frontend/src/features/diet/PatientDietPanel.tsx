import { useQuery } from '@tanstack/react-query'
import { Button, Card, Empty, List, Space, Tag, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'

import { EmptyMotion } from '../../components/reactbits/EmptyMotion'
import { ROUTE_PATHS } from '../../config/routes'
import { fetchDietRecommendations } from '../../services/dietService'

interface PatientDietPanelProps {
  patientId: number
}

const statusColorMap = {
  pending: 'gold',
  approved: 'blue',
  rejected: 'red',
} as const

const statusLabelMap = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
} as const

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
    return <Card loading className="panel-card" />
  }

  const items = recommendationsQuery.data?.items ?? []

  if (!items.length) {
    return <EmptyMotion description="该患者暂无饮食推荐记录" />
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="diet-panel-header">
        <Typography.Text type="secondary">
          最近推荐、审核状态与推送结果均来自真实 API。
        </Typography.Text>
        <Button onClick={() => navigate(`${ROUTE_PATHS.dietManage}?patientId=${patientId}`)}>
          前往饮食推荐管理
        </Button>
      </div>
      <List
        dataSource={items}
        renderItem={(item) => (
          <List.Item className="notification-list-item">
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={statusColorMap[item.review_status]}>{statusLabelMap[item.review_status]}</Tag>
                <Tag>{item.push_status}</Tag>
                <Typography.Text type="secondary">
                  {item.created_at.replace('T', ' ').slice(0, 16)}
                </Typography.Text>
              </Space>
              <Typography.Text strong>
                总热量 {item.content.total_calories} kcal
              </Typography.Text>
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                {item.content.notes || '暂无备注'}
              </Typography.Paragraph>
              <Space wrap>
                {item.content.meals.map((meal) => (
                  <Tag key={`${item.id}-${meal.meal_type}`}>{meal.meal_type}</Tag>
                ))}
              </Space>
            </Space>
          </List.Item>
        )}
        locale={{ emptyText: <Empty description="暂无数据" /> }}
      />
    </Space>
  )
}
