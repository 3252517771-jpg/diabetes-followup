import type { ReactNode } from 'react'
import { Typography } from 'antd'

import { CountUpValue } from '../../components/CountUpValue'
import type { GlucoseStats } from '../../types/glucose'
import { toGlucoseNumber } from './glucoseOptions'

interface PatientGlucoseSummarySectionProps {
  stats?: GlucoseStats
}

function formatMetricValue(value: number | null | undefined) {
  return value === null || value === undefined ? '--' : `${value.toFixed(2)} mmol/L`
}

interface SummaryMetricItemProps {
  label: string
  value: ReactNode
  hint: string
}

function SummaryMetricItem({ label, value, hint }: SummaryMetricItemProps) {
  return (
    <div className="patient-glucose-metric-card">
      <span className="patient-glucose-metric-card__label">{label}</span>
      <strong className="patient-glucose-metric-card__value">{value}</strong>
      <span className="patient-glucose-metric-card__hint">{hint}</span>
    </div>
  )
}

export function PatientGlucoseSummarySection({ stats }: PatientGlucoseSummarySectionProps) {
  const latestRecord =
    stats?.latest_record && toGlucoseNumber(stats.latest_record.value) !== null
      ? `${toGlucoseNumber(stats.latest_record.value)?.toFixed(2)} mmol/L`
      : '--'

  return (
    <div className="patient-glucose-summary-card">
      <div className="patient-glucose-summary-card__intro">
        <Typography.Text className="dashboard-kicker">Glucose Snapshot</Typography.Text>
        <Typography.Title level={3} className="panel-title">
          监测摘要
        </Typography.Title>
        <Typography.Paragraph className="panel-subtitle">
          把判断层指标压缩在一张卡里，避免来回切换视线。
        </Typography.Paragraph>
      </div>

      <div className="patient-glucose-summary-card__hero-grid">
        <SummaryMetricItem
          label="30 日记录数"
          value={<CountUpValue value={stats?.total_records ?? 0} />}
          hint="当前患者近 30 天监测次数"
        />
        <SummaryMetricItem
          label="异常率"
          value={<CountUpValue value={stats?.abnormal_rate ?? 0} suffix="%" precision={1} />}
          hint="异常记录占比"
        />
        <SummaryMetricItem
          label="最近一条记录"
          value={latestRecord}
          hint={stats?.latest_record ? stats.latest_record.measure_time.replace('T', ' ').slice(0, 16) : '暂无最新记录'}
        />
      </div>

      <div className="patient-glucose-summary-card__metric-grid">
        <SummaryMetricItem label="空腹均值" value={formatMetricValue(stats?.fasting_avg)} hint="用于晨间控制判断" />
        <SummaryMetricItem label="餐后均值" value={formatMetricValue(stats?.postprandial_avg)} hint="用于饮食反应判断" />
        <SummaryMetricItem label="睡前均值" value={formatMetricValue(stats?.bedtime_avg)} hint="用于夜间风险判断" />
        <SummaryMetricItem label="随机均值" value={formatMetricValue(stats?.random_avg)} hint="用于全天波动补充观察" />
      </div>
    </div>
  )
}
