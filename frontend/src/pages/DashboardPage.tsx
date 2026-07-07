import { useQuery } from '@tanstack/react-query'
import { Card, Col, Progress, Row, Space, Statistic, Typography } from 'antd'

import { AnimatedTitle } from '../components/reactbits/AnimatedTitle'
import { EmptyMotion } from '../components/reactbits/EmptyMotion'
import { DashboardPendingChart } from '../features/dashboard/DashboardPendingChart'
import { DashboardStatusChart } from '../features/dashboard/DashboardStatusChart'
import { DashboardTrendChart } from '../features/dashboard/DashboardTrendChart'
import {
  fetchDashboardDistribution,
  fetchDashboardStats,
  fetchDashboardTrend,
} from '../services/dashboardService'

export function DashboardPage() {
  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await fetchDashboardStats()
      if (!response.data) {
        throw new Error(response.message || '工作台统计加载失败')
      }
      return response.data
    },
  })

  const trendQuery = useQuery({
    queryKey: ['dashboard-trend', 7],
    queryFn: async () => {
      const response = await fetchDashboardTrend(7)
      if (!response.data) {
        throw new Error(response.message || '血糖趋势加载失败')
      }
      return response.data
    },
  })

  const distributionQuery = useQuery({
    queryKey: ['dashboard-distribution'],
    queryFn: async () => {
      const response = await fetchDashboardDistribution()
      if (!response.data) {
        throw new Error(response.message || '患者分布加载失败')
      }
      return response.data
    },
  })

  const stats = statsQuery.data
  const trend = trendQuery.data
  const overview = distributionQuery.data

  return (
    <div className="page-shell">
      <div className="page-toolbar">
        <Typography.Text className="dashboard-kicker">Dashboard</Typography.Text>
        <Typography.Title level={2} className="panel-title">
          <AnimatedTitle>科室工作台</AnimatedTitle>
        </Typography.Title>
        <Typography.Paragraph className="panel-subtitle">
          仅展示当前账号可管辖患者的聚合指标，不下钻到单患者趋势。
        </Typography.Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card className="metric-card" loading={statsQuery.isLoading}>
            <Statistic title="患者总数" value={stats?.patient_count ?? 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="metric-card" loading={statsQuery.isLoading}>
            <Statistic title="随访中" value={stats?.following_count ?? 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="metric-card" loading={statsQuery.isLoading}>
            <Statistic title="血糖达标率" value={stats?.compliance_rate ?? 0} suffix="%" precision={1} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="metric-card" loading={statsQuery.isLoading}>
            <Statistic title="待处理事项" value={stats?.todo_count ?? 0} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={16}>
          <Card
            className="panel-card"
            title="近 7 天患者血糖均值趋势"
            extra={<Typography.Text type="secondary">空腹 / 餐后</Typography.Text>}
            loading={trendQuery.isLoading}
          >
            {trend?.points.length ? (
              <DashboardTrendChart points={trend.points} />
            ) : (
              <EmptyMotion description="近 7 天暂无可绘制的血糖趋势数据" />
            )}
          </Card>
        </Col>
        <Col span={8}>
          <Card className="panel-card" title="总体达标进度" loading={statsQuery.isLoading}>
            <Space direction="vertical" size={20} style={{ width: '100%' }}>
              <Progress
                type="dashboard"
                percent={Math.round(stats?.compliance_rate ?? 0)}
                strokeColor="#2563eb"
              />
              <Typography.Paragraph className="dashboard-insight">
                当前工作台采用总体聚合视角，单个患者的详细趋势放在患者详情页查看。
              </Typography.Paragraph>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card className="panel-card" title="患者状态分布" loading={distributionQuery.isLoading}>
            {overview?.status_distribution.length ? (
              <DashboardStatusChart items={overview.status_distribution} />
            ) : (
              <EmptyMotion description="暂无患者状态分布数据" />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card className="panel-card" title="待处理事项构成" loading={distributionQuery.isLoading}>
            {overview?.pending_items.length ? (
              <DashboardPendingChart items={overview.pending_items} />
            ) : (
              <EmptyMotion description="暂无待处理事项" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
