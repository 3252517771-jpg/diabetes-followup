import { useQuery } from '@tanstack/react-query'
import { Empty, Progress, Space, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'

import { CountUpValue } from '../components/CountUpValue'
import { PageIntro } from '../components/PageIntro'
import { QueryStateAlert } from '../components/QueryStateAlert'
import {
  DashboardStatCard,
  MagicBentoGrid,
  MagicBentoItem,
} from '../components/reactbits/MagicBentoGrid'
import { EmptyMotion } from '../components/reactbits/EmptyMotion'
import { DailyRecordChart } from '../features/glucose/DailyRecordChart'
import { GlucoseSummaryPanel } from '../features/glucose/GlucoseSummaryPanel'
import {
  GLUCOSE_CATEGORY_OPTIONS,
  getGlucoseCategoryLabel,
  toGlucoseNumber,
} from '../features/glucose/glucoseOptions'
import { fetchGlucoseOverview } from '../services/glucoseService'
import type { BloodGlucoseRecord } from '../types/glucose'

export function GlucoseOverviewPage() {
  const overviewQuery = useQuery({
    queryKey: ['glucose-overview', 7],
    queryFn: async () => {
      const response = await fetchGlucoseOverview(7)
      if (!response.data) {
        throw new Error(response.message || '血糖总览加载失败')
      }
      return response.data
    },
  })

  const overview = overviewQuery.data
  const columns: ColumnsType<BloodGlucoseRecord> = [
    { title: '患者', dataIndex: 'patient_name' },
    {
      title: '测量时间',
      dataIndex: 'measure_time',
      render: (value: string) => value.replace('T', ' ').slice(0, 16),
    },
    {
      title: '分类',
      dataIndex: 'category',
      render: (value: string) => getGlucoseCategoryLabel(value),
    },
    {
      title: '血糖值',
      dataIndex: 'value',
      render: (value: number | string) => `${toGlucoseNumber(value)?.toFixed(2) ?? '--'} mmol/L`,
    },
    {
      title: '异常',
      dataIndex: 'abnormal_reason',
      render: (value: string | null) => (
        <Tag color={value === 'low' ? 'gold' : 'red'}>{value === 'low' ? '偏低' : '偏高'}</Tag>
      ),
    },
  ]

  return (
    <div className="page-shell page-shell--dashboard">
      <PageIntro
        kicker="Glucose"
        title="血糖总览"
        description="聚合当前账号可见患者的真实血糖记录，先看趋势与异常摘要，再回看近期异常明细。"
      />

      {overviewQuery.isError ? (
        <div className="panel-card">
          <QueryStateAlert
            title="血糖总览加载失败"
            description={overviewQuery.error.message}
            onRetry={() => void overviewQuery.refetch()}
          />
        </div>
      ) : null}

      <div className="dashboard-stat-grid">
        <DashboardStatCard
          label="可见患者"
          loading={overviewQuery.isLoading}
          value={overview?.patient_count ?? 0}
          hint="当前账号管理范围"
        />
        <DashboardStatCard
          label="7日记录"
          loading={overviewQuery.isLoading}
          value={overview?.total_records ?? 0}
          hint="近七天已同步血糖记录"
          accent="green"
        />
        <DashboardStatCard
          label="异常记录"
          loading={overviewQuery.isLoading}
          value={overview?.abnormal_count ?? 0}
          hint="需要优先回看的异常次数"
        />
        <DashboardStatCard
          label="异常率"
          loading={overviewQuery.isLoading}
          value={<CountUpValue value={overview?.abnormal_rate ?? 0} suffix="%" precision={1} />}
          hint="按近七日记录聚合"
        />
      </div>

      <MagicBentoGrid>
        <MagicBentoItem
          title="近 7 日记录趋势"
          subtitle="先看记录活跃度与异常率，再决定是否下钻到患者详情页进一步判断。"
          extra={
            <Space size={8}>
              <Tag className="dashboard-soft-tag">真实接口</Tag>
              <Tag className="dashboard-soft-tag">近 7 日</Tag>
            </Space>
          }
          className="magic-bento-card--glucose-primary"
        >
          <div className="glucose-main-layout">
            <div className="glucose-main-layout__chart">
              {overview?.daily_record_counts.length ? (
                <DailyRecordChart items={overview.daily_record_counts} />
              ) : (
                <EmptyMotion description="近 7 天暂无可绘制的血糖记录趋势。" />
              )}
            </div>
            <GlucoseSummaryPanel
              className="glucose-main-layout__aside"
              items={[
                {
                  label: '可见患者',
                  value: overview?.patient_count ?? 0,
                  hint: '纳入本次聚合范围',
                },
                {
                  label: '记录总数',
                  value: overview?.total_records ?? 0,
                  hint: '近 7 日真实上传记录',
                },
                {
                  label: '异常次数',
                  value: overview?.abnormal_count ?? 0,
                  hint: '偏高或偏低都计入',
                },
                {
                  label: '异常率',
                  value: <CountUpValue value={overview?.abnormal_rate ?? 0} suffix="%" precision={1} />,
                  hint: '用于快速判断风险密度',
                },
              ]}
            />
          </div>
        </MagicBentoItem>

        <MagicBentoItem
          title="分类分布"
          subtitle="把异常判读收回趋势旁边后，分类分布继续承担第二视角。"
          className="magic-bento-card--glucose-secondary"
        >
          <div className="glucose-distribution-list">
            {GLUCOSE_CATEGORY_OPTIONS.map((option) => {
              const count = overview?.category_distribution[option.value] ?? 0
              const percent = overview?.total_records
                ? Math.round((count / overview.total_records) * 100)
                : 0
              return (
                <div key={option.value} className="glucose-distribution-item">
                  <div className="distribution-row">
                    <span>{option.label}</span>
                    <span>{count} 条</span>
                  </div>
                  <Progress percent={percent} size="small" showInfo={false} />
                </div>
              )
            })}
          </div>
        </MagicBentoItem>

        <MagicBentoItem
          title="近期异常记录"
          subtitle="保留为辅助区，帮助快速定位需要回看的记录，不抢占第一视觉层级。"
          className="magic-bento-card--full"
        >
          <div className="glucose-record-table">
            <Table
              rowKey="id"
              size="small"
              loading={overviewQuery.isLoading}
              columns={columns}
              dataSource={overview?.recent_abnormal_records ?? []}
              pagination={false}
              locale={{ emptyText: <Empty description="近 7 天暂无异常血糖记录" /> }}
            />
          </div>
        </MagicBentoItem>
      </MagicBentoGrid>
    </div>
  )
}
