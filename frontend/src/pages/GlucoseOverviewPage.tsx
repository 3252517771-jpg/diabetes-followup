import { useQuery } from '@tanstack/react-query'
import { Card, Col, Empty, Progress, Row, Space, Statistic, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'

import { QueryStateAlert } from '../components/QueryStateAlert'
import { DailyRecordChart } from '../features/glucose/DailyRecordChart'
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
      render: (value: string | null) => <Tag color={value === 'low' ? 'gold' : 'red'}>{value === 'low' ? '偏低' : '偏高'}</Tag>,
    },
  ]

  return (
    <div className="page-shell">
      <div className="page-toolbar">
        <Typography.Text className="dashboard-kicker">Glucose</Typography.Text>
        <Typography.Title level={2} className="panel-title">
          血糖总览
        </Typography.Title>
        <Typography.Paragraph className="panel-subtitle">
          汇总当前账号可见患者的真实血糖记录，帮助快速识别异常变化。
        </Typography.Paragraph>
      </div>

      {overviewQuery.isError ? (
        <Card className="panel-card">
          <QueryStateAlert
            title="血糖总览加载失败"
            description={overviewQuery.error.message}
            onRetry={() => void overviewQuery.refetch()}
          />
        </Card>
      ) : null}

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card className="metric-card" loading={overviewQuery.isLoading}>
            <Statistic title="可见患者" value={overview?.patient_count ?? 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="metric-card" loading={overviewQuery.isLoading}>
            <Statistic title="7日记录" value={overview?.total_records ?? 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="metric-card" loading={overviewQuery.isLoading}>
            <Statistic title="异常记录" value={overview?.abnormal_count ?? 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="metric-card" loading={overviewQuery.isLoading}>
            <Statistic title="异常率" value={overview?.abnormal_rate ?? 0} suffix="%" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={15}>
          <Card className="panel-card" title="每日记录量" loading={overviewQuery.isLoading}>
            {overview?.daily_record_counts.length ? (
              <DailyRecordChart items={overview.daily_record_counts} />
            ) : (
              <Empty description="最近 7 天暂无血糖记录量数据" />
            )}
          </Card>
        </Col>
        <Col span={9}>
          <Card className="panel-card" title="分类分布" loading={overviewQuery.isLoading}>
            <Space direction="vertical" size={14} style={{ width: '100%' }}>
              {GLUCOSE_CATEGORY_OPTIONS.map((option) => {
                const count = overview?.category_distribution[option.value] ?? 0
                const percent = overview?.total_records
                  ? Math.round((count / overview.total_records) * 100)
                  : 0
                return (
                  <div key={option.value}>
                    <div className="distribution-row">
                      <span>{option.label}</span>
                      <span>{count} 条</span>
                    </div>
                    <Progress percent={percent} size="small" showInfo={false} />
                  </div>
                )
              })}
            </Space>
          </Card>
        </Col>
      </Row>

      <Card className="panel-card" title="近期异常血糖">
        <Table
          rowKey="id"
          size="small"
          loading={overviewQuery.isLoading}
          columns={columns}
          dataSource={overview?.recent_abnormal_records ?? []}
          pagination={false}
          locale={{ emptyText: <Empty description="最近 7 天暂无异常血糖记录" /> }}
        />
      </Card>
    </div>
  )
}
