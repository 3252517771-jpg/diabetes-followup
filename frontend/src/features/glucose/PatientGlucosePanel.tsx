import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, Col, Empty, Row, Space, Statistic, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import {
  fetchPatientGlucoseRecords,
  fetchPatientGlucoseStats,
  fetchPatientGlucoseTrend,
} from '../../services/glucoseService'
import type { BloodGlucoseRecord } from '../../types/glucose'
import { GlucoseRecordForm } from './GlucoseRecordForm'
import { GlucoseTrendChart } from './GlucoseTrendChart'
import { getGlucoseCategoryLabel, toGlucoseNumber } from './glucoseOptions'

interface PatientGlucosePanelProps {
  patientId: number
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

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="glucose-panel-header">
        <div>
          <Typography.Title level={4} className="panel-title">
            血糖监测
          </Typography.Title>
          <Typography.Text type="secondary">最近 30 天统计，趋势图展示最近 14 天均值</Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
          录入血糖
        </Button>
      </div>

      <Row gutter={[12, 12]}>
        <Col span={6}>
          <Card className="metric-card" loading={statsQuery.isLoading}>
            <Statistic title="记录数" value={stats?.total_records ?? 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="metric-card" loading={statsQuery.isLoading}>
            <Statistic title="异常率" value={stats?.abnormal_rate ?? 0} suffix="%" />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="metric-card" loading={statsQuery.isLoading}>
            <Statistic title="空腹均值" value={stats?.fasting_avg ?? '--'} suffix="mmol/L" />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="metric-card" loading={statsQuery.isLoading}>
            <Statistic title="餐后均值" value={stats?.postprandial_avg ?? '--'} suffix="mmol/L" />
          </Card>
        </Col>
      </Row>

      <Card className="panel-card" title="血糖趋势">
        {trend && trend.points.length > 0 ? (
          <GlucoseTrendChart points={trend.points} />
        ) : (
          <Empty description="暂无血糖趋势数据" />
        )}
      </Card>

      <Card className="panel-card" title="最近记录">
        <Table
          rowKey="id"
          size="small"
          loading={recordsQuery.isLoading}
          columns={columns}
          dataSource={records?.items ?? []}
          pagination={false}
          locale={{ emptyText: <Empty description="暂无血糖记录" /> }}
        />
      </Card>

      <GlucoseRecordForm patientId={patientId} open={formOpen} onClose={() => setFormOpen(false)} />
    </Space>
  )
}
