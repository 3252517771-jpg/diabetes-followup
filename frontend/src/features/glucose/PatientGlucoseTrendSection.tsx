import { Empty, Space, Tag, Typography } from 'antd'

import { CountUpValue } from '../../components/CountUpValue'
import { EmptyMotion } from '../../components/reactbits/EmptyMotion'
import type { GlucoseStats, GlucoseTrend } from '../../types/glucose'
import { GlucoseSummaryPanel } from './GlucoseSummaryPanel'
import { GlucoseTrendChart } from './GlucoseTrendChart'
import { toGlucoseNumber } from './glucoseOptions'

interface PatientGlucoseTrendSectionProps {
  trend?: GlucoseTrend
  stats?: GlucoseStats
  loading?: boolean
}

function getTrendLabel(stats?: GlucoseStats) {
  if (!stats || stats.total_records === 0) {
    return '数据不足'
  }

  if ((stats.abnormal_rate ?? 0) >= 50) {
    return '波动偏大'
  }

  if ((stats.latest_record && toGlucoseNumber(stats.latest_record.value) && toGlucoseNumber(stats.latest_record.value)! >= 11.1) || (stats.random_avg ?? 0) >= 10) {
    return '持续偏高'
  }

  return '相对平稳'
}

export function PatientGlucoseTrendSection({
  trend,
  stats,
  loading = false,
}: PatientGlucoseTrendSectionProps) {
  const latestValue =
    stats?.latest_record && toGlucoseNumber(stats.latest_record.value) !== null
      ? `${toGlucoseNumber(stats.latest_record.value)?.toFixed(2)} mmol/L`
      : '--'

  const summaryItems = [
    {
      label: '最新值',
      value: latestValue,
      hint: stats?.latest_record ? stats.latest_record.measure_time.replace('T', ' ').slice(0, 16) : '暂无最新记录',
    },
    {
      label: '14 日异常点数',
      value: <CountUpValue value={stats?.abnormal_count ?? 0} />,
      hint: '用于快速判断近期干预紧迫度',
    },
    {
      label: '趋势判断',
      value: getTrendLabel(stats),
      hint: '结合最近记录和异常率给出简要结论',
    },
  ]

  return (
    <div className="patient-glucose-trend-card">
      <div className="patient-glucose-trend-card__intro">
        <div>
          <Typography.Text className="dashboard-kicker">Glucose Trend</Typography.Text>
          <Typography.Title level={3} className="panel-title">
            血糖趋势
          </Typography.Title>
          <Typography.Paragraph className="panel-subtitle">
            先看近 14 日波动，再决定是否下沉到明细记录处理。
          </Typography.Paragraph>
        </div>
        <Space size={8}>
          <Tag className="dashboard-soft-tag">当前患者</Tag>
          <Tag className="dashboard-soft-tag">14 日趋势</Tag>
        </Space>
      </div>

      <div className="patient-glucose-trend-card__layout">
        <div className="patient-glucose-trend-card__chart">
          {loading ? (
            <Empty description="趋势图加载中" />
          ) : trend && trend.points.length > 0 ? (
            <GlucoseTrendChart points={trend.points} />
          ) : (
            <EmptyMotion description="暂无可绘制的血糖趋势数据" />
          )}
        </div>
        <GlucoseSummaryPanel className="patient-glucose-trend-card__summary" items={summaryItems} />
      </div>
    </div>
  )
}
