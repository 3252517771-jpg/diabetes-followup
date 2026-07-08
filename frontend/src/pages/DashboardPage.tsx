import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Progress, Space, Tag, Typography } from 'antd'

import { CountUpValue } from '../components/CountUpValue'
import { PageIntro } from '../components/PageIntro'
import { QueryStateAlert } from '../components/QueryStateAlert'
import {
  DashboardStatCard,
  MagicBentoGrid,
  MagicBentoItem,
} from '../components/reactbits/MagicBentoGrid'
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

  const statusHighlights = useMemo(
    () =>
      [...(overview?.status_distribution ?? [])]
        .sort((left, right) => right.count - left.count)
        .slice(0, 3),
    [overview?.status_distribution],
  )

  return (
    <div className="page-shell page-shell--dashboard">
      <PageIntro
        kicker="Dashboard"
        title="科室工作台"
        description="仅展示当前账号可管理患者的聚合指标，不下钻到单患者趋势。"
      />

      {statsQuery.isError || trendQuery.isError || distributionQuery.isError ? (
        <div className="panel-card">
          <QueryStateAlert
            title="工作台数据暂时不可用"
            description={
              statsQuery.error?.message ??
              trendQuery.error?.message ??
              distributionQuery.error?.message ??
              '请稍后重试'
            }
            onRetry={() => {
              void statsQuery.refetch()
              void trendQuery.refetch()
              void distributionQuery.refetch()
            }}
          />
        </div>
      ) : null}

      <div className="dashboard-stat-grid">
        <DashboardStatCard
          label="患者总数"
          loading={statsQuery.isLoading}
          value={stats?.patient_count ?? 0}
          hint="当前账号管理范围"
        />
        <DashboardStatCard
          label="随访中"
          loading={statsQuery.isLoading}
          value={stats?.following_count ?? 0}
          hint="活跃随访患者"
          accent="green"
        />
        <DashboardStatCard
          label="血糖达标率"
          loading={statsQuery.isLoading}
          value={<CountUpValue value={stats?.compliance_rate ?? 0} suffix="%" precision={1} />}
          hint="近 7 日聚合指标"
        />
        <DashboardStatCard
          label="待处理事项"
          loading={statsQuery.isLoading}
          value={<CountUpValue value={stats?.todo_count ?? 0} />}
          hint="待审阅与待跟进"
        />
      </div>

      <MagicBentoGrid>
        <MagicBentoItem
          title="近 7 天患者血糖均值趋势"
          subtitle="空腹与餐后均值，聚合展示当前账号管理患者数据"
          extra={
            <Space size={8}>
              <Tag className="dashboard-soft-tag">空腹</Tag>
              <Tag className="dashboard-soft-tag">餐后</Tag>
            </Space>
          }
          className="magic-bento-card--primary"
        >
          {trend?.points.length ? (
            <DashboardTrendChart points={trend.points} />
          ) : (
            <EmptyMotion description="近 7 天暂无可绘制的血糖趋势数据" />
          )}
        </MagicBentoItem>

        <MagicBentoItem
          title="总体达标摘要"
          subtitle="工作台保持总体聚合视角，单患者趋势留在详情页查看"
          className="magic-bento-card--summary"
        >
          <div className="dashboard-summary-panel">
            <div className="dashboard-summary-ring">
              <Progress
                type="dashboard"
                percent={Math.round(stats?.compliance_rate ?? 0)}
                strokeColor="#2563eb"
              />
            </div>
            <div className="dashboard-summary-metrics">
              <div className="dashboard-summary-metric">
                <span className="dashboard-summary-metric__label">达标率</span>
                <span className="dashboard-summary-metric__value">
                  <CountUpValue value={stats?.compliance_rate ?? 0} suffix="%" precision={1} />
                </span>
              </div>
              <div className="dashboard-summary-metric">
                <span className="dashboard-summary-metric__label">待处理</span>
                <span className="dashboard-summary-metric__value">
                  <CountUpValue value={stats?.todo_count ?? 0} />
                </span>
              </div>
            </div>
          </div>

          <div className="dashboard-summary-list">
            <div className="dashboard-summary-list__item">
              <span className="dashboard-summary-list__label">管理患者</span>
              <strong className="dashboard-summary-list__value">{stats?.patient_count ?? 0}</strong>
            </div>
            <div className="dashboard-summary-list__item">
              <span className="dashboard-summary-list__label">随访活跃</span>
              <strong className="dashboard-summary-list__value">{stats?.following_count ?? 0}</strong>
            </div>
            <div className="dashboard-summary-list__item">
              <span className="dashboard-summary-list__label">今日关注</span>
              <strong className="dashboard-summary-list__value">{stats?.todo_count ?? 0}</strong>
            </div>
          </div>

          <Typography.Paragraph className="dashboard-insight">
            工作台聚焦科室层面的扫描、判断与优先级分配，不把信息负担压到单个患者细节里。
          </Typography.Paragraph>
        </MagicBentoItem>

        <MagicBentoItem
          title="患者状态分布"
          subtitle="作为第二优先图表，帮助快速判断整体患者状态结构"
          className="magic-bento-card--secondary"
        >
          <div className="dashboard-secondary-layout">
            <div className="dashboard-secondary-layout__chart">
              {overview?.status_distribution.length ? (
                <DashboardStatusChart items={overview.status_distribution} />
              ) : (
                <EmptyMotion description="暂无患者状态分布数据" />
              )}
            </div>
            <div className="dashboard-secondary-layout__aside">
              <Typography.Text className="dashboard-secondary-layout__label">
                重点状态
              </Typography.Text>
              <div className="dashboard-status-highlight-list">
                {statusHighlights.length ? (
                  statusHighlights.map((item) => (
                    <div key={item.status} className="dashboard-status-highlight">
                      <span className="dashboard-status-highlight__name">{item.status}</span>
                      <strong className="dashboard-status-highlight__count">{item.count}</strong>
                    </div>
                  ))
                ) : (
                  <Typography.Text type="secondary">暂无状态摘要</Typography.Text>
                )}
              </div>
            </div>
          </div>
        </MagicBentoItem>

        <MagicBentoItem
          title="待处理事项构成"
          subtitle="保留为辅助视图，用于判断值班处理重心"
          className="magic-bento-card--tertiary"
        >
          {overview?.pending_items.length ? (
            <DashboardPendingChart items={overview.pending_items} />
          ) : (
            <EmptyMotion description="暂无待处理事项" />
          )}
        </MagicBentoItem>
      </MagicBentoGrid>
    </div>
  )
}
