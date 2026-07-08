import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PlusOutlined } from '@ant-design/icons'
import { Button, Empty, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'

import { CountUpValue } from '../../components/CountUpValue'
import { MagicBentoGrid, MagicBentoItem } from '../../components/reactbits/MagicBentoGrid'
import { EmptyMotion } from '../../components/reactbits/EmptyMotion'
import {
  fetchPatientGlucoseRecords,
  fetchPatientGlucoseStats,
  fetchPatientGlucoseTrend,
} from '../../services/glucoseService'
import type { BloodGlucoseRecord } from '../../types/glucose'
import { GlucoseRecordForm } from './GlucoseRecordForm'
import { GlucoseSummaryPanel } from './GlucoseSummaryPanel'
import { GlucoseTrendChart } from './GlucoseTrendChart'
import { getGlucoseCategoryLabel, toGlucoseNumber } from './glucoseOptions'

interface PatientGlucosePanelProps {
  patientId: number
}

function formatMetricValue(value: number | null | undefined) {
  return value === null || value === undefined ? '--' : `${value.toFixed(2)} mmol/L`
}

export function PatientGlucosePanel({ patientId }: PatientGlucosePanelProps) {
  const [formOpen, setFormOpen] = useState(false)

  const recordsQuery = useQuery({
    queryKey: ['patient-glucose-records', patientId, 1, 10],
    queryFn: async () => {
      const response = await fetchPatientGlucoseRecords(patientId, { page: 1, size: 10 })
      if (!response.data) {
        throw new Error(response.message || '血糖记录加载失败')
      }
      return response.data
    },
  })

  const trendQuery = useQuery({
    queryKey: ['patient-glucose-trend', patientId, 14],
    queryFn: async () => {
      const response = await fetchPatientGlucoseTrend(patientId, 14)
      if (!response.data) {
        throw new Error(response.message || '血糖趋势加载失败')
      }
      return response.data
    },
  })

  const statsQuery = useQuery({
    queryKey: ['patient-glucose-stats', patientId, 30],
    queryFn: async () => {
      const response = await fetchPatientGlucoseStats(patientId, 30)
      if (!response.data) {
        throw new Error(response.message || '血糖统计加载失败')
      }
      return response.data
    },
  })

  const columns: ColumnsType<BloodGlucoseRecord> = [
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
      title: '状态',
      dataIndex: 'is_abnormal',
      render: (isAbnormal: boolean, record) =>
        isAbnormal ? (
          <Tag color={record.abnormal_reason === 'low' ? 'gold' : 'red'}>
            {record.abnormal_reason === 'low' ? '偏低' : '偏高'}
          </Tag>
        ) : (
          <Tag color="green">达标</Tag>
        ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      render: (value: string) => (value === 'patient' ? '患者录入' : '医护录入'),
    },
  ]

  const stats = statsQuery.data
  const records = recordsQuery.data
  const trend = trendQuery.data

  const summaryItems = useMemo(
    () => [
      {
        label: '30日记录',
        value: stats?.total_records ?? 0,
        hint: '当前患者近 30 天监测次数',
      },
      {
        label: '异常率',
        value: <CountUpValue value={stats?.abnormal_rate ?? 0} suffix="%" precision={1} />,
        hint: '近 30 天异常记录占比',
      },
      {
        label: '最新记录',
        value:
          stats?.latest_record && toGlucoseNumber(stats.latest_record.value) !== null
            ? `${toGlucoseNumber(stats.latest_record.value)?.toFixed(2)} mmol/L`
            : '--',
        hint: stats?.latest_record ? stats.latest_record.measure_time.replace('T', ' ').slice(0, 16) : '暂无最新记录',
      },
    ],
    [stats],
  )

  return (
    <Space direction="vertical" size={18} style={{ width: '100%' }}>
      <div className="glucose-panel-header">
        <div>
          <Typography.Title level={4} className="panel-title">
            血糖监测
          </Typography.Title>
          <Typography.Text type="secondary">
            延续总览页的同一套判读语言，趋势优先，异常摘要紧贴趋势图，记录明细退到辅助区。
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
          录入血糖
        </Button>
      </div>

      <MagicBentoGrid>
        <MagicBentoItem
          title="近 14 日血糖趋势"
          subtitle="围绕当前患者展开，优先用于趋势判断与异常识别。"
          extra={
            <Space size={8}>
              <Tag className="dashboard-soft-tag">当前患者</Tag>
              <Tag className="dashboard-soft-tag">14 日趋势</Tag>
            </Space>
          }
          className="magic-bento-card--glucose-primary"
        >
          <div className="glucose-main-layout">
            <div className="glucose-main-layout__chart">
              {trend && trend.points.length > 0 ? (
                <GlucoseTrendChart points={trend.points} />
              ) : (
                <EmptyMotion description="暂无可绘制的患者血糖趋势。" />
              )}
            </div>
            <GlucoseSummaryPanel className="glucose-main-layout__aside" items={summaryItems} />
          </div>
        </MagicBentoItem>

        <MagicBentoItem
          title="监测摘要"
          subtitle="把分类均值与最新状态放在同一张卡里，减少来回切换。"
          className="magic-bento-card--glucose-secondary"
        >
          <div className="glucose-distribution-list">
            <div className="glucose-distribution-item glucose-distribution-item--soft">
              <div className="distribution-row">
                <span>空腹均值</span>
                <span>{formatMetricValue(stats?.fasting_avg)}</span>
              </div>
            </div>
            <div className="glucose-distribution-item glucose-distribution-item--soft">
              <div className="distribution-row">
                <span>餐后均值</span>
                <span>{formatMetricValue(stats?.postprandial_avg)}</span>
              </div>
            </div>
            <div className="glucose-distribution-item glucose-distribution-item--soft">
              <div className="distribution-row">
                <span>睡前均值</span>
                <span>{formatMetricValue(stats?.bedtime_avg)}</span>
              </div>
            </div>
            <div className="glucose-distribution-item glucose-distribution-item--soft">
              <div className="distribution-row">
                <span>随机均值</span>
                <span>{formatMetricValue(stats?.random_avg)}</span>
              </div>
            </div>
          </div>
        </MagicBentoItem>

        <MagicBentoItem
          title="近期记录"
          subtitle="保留明细表，作为辅助回看区，不再与趋势图抢同一层视觉权重。"
          className="magic-bento-card--full"
        >
          <div className="glucose-record-table">
            <Table
              rowKey="id"
              size="small"
              loading={recordsQuery.isLoading}
              columns={columns}
              dataSource={records?.items ?? []}
              pagination={false}
              locale={{ emptyText: <Empty description="暂无血糖记录" /> }}
            />
          </div>
        </MagicBentoItem>
      </MagicBentoGrid>

      <GlucoseRecordForm patientId={patientId} open={formOpen} onClose={() => setFormOpen(false)} />
    </Space>
  )
}
