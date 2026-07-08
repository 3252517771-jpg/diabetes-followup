import { useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { Button, Empty, Segmented, Table, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'

import type { BloodGlucoseRecord, GlucoseCategory } from '../../types/glucose'
import { GlucoseRecordForm } from './GlucoseRecordForm'
import { getGlucoseCategoryLabel, toGlucoseNumber } from './glucoseOptions'
import { usePatientGlucoseData } from './usePatientGlucoseData'

interface PatientGlucoseRecordsSectionProps {
  patientId: number
}

const categoryOptions: Array<{ label: string; value: GlucoseCategory | 'all' }> = [
  { label: '全部', value: 'all' },
  { label: '空腹', value: 'fasting' },
  { label: '餐后', value: 'postprandial' },
  { label: '睡前', value: 'bedtime' },
  { label: '随机', value: 'random' },
]

export function PatientGlucoseRecordsSection({
  patientId,
}: PatientGlucoseRecordsSectionProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [category, setCategory] = useState<GlucoseCategory | 'all'>('all')

  const { recordsQuery } = usePatientGlucoseData({
    patientId,
    category: category === 'all' ? undefined : category,
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
          <span className="patient-glucose-status patient-glucose-status--danger">
            {record.abnormal_reason === 'low' ? '偏低' : '偏高'}
          </span>
        ) : (
          <span className="patient-glucose-status patient-glucose-status--success">达标</span>
        ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      render: (value: string) => (value === 'patient' ? '患者录入' : '医护录入'),
    },
    {
      title: '备注',
      dataIndex: 'notes',
      render: (value: string | null) =>
        value?.trim() ? (
          <Tooltip title={value}>
            <span className="patient-glucose-note-cell">{value}</span>
          </Tooltip>
        ) : (
          <Typography.Text type="secondary">--</Typography.Text>
        ),
    },
  ]

  return (
    <div className="patient-glucose-records-card">
      <div className="patient-glucose-records-card__header">
        <div>
          <Typography.Text className="dashboard-kicker">Recent Records</Typography.Text>
          <Typography.Title level={3} className="panel-title">
            近期记录
          </Typography.Title>
          <Typography.Paragraph className="panel-subtitle">
            明细层只负责查看与补录，先把近期记录完整展开给医生读。
          </Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
          录入血糖
        </Button>
      </div>

      <div className="patient-glucose-records-card__toolbar">
        <Segmented
          options={categoryOptions}
          value={category}
          onChange={(value) => setCategory(value as GlucoseCategory | 'all')}
        />
        <Typography.Text type="secondary">
          当前版本对接真实新增接口，编辑与删除待后端开放后接入。
        </Typography.Text>
      </div>

      <Table
        rowKey="id"
        size="small"
        loading={recordsQuery.isLoading}
        columns={columns}
        dataSource={recordsQuery.data?.items ?? []}
        pagination={false}
        locale={{ emptyText: <Empty description="暂无血糖记录" /> }}
      />

      <GlucoseRecordForm patientId={patientId} open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}
