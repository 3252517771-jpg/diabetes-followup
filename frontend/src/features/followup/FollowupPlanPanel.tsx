import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Card, DatePicker, Form, Modal, Progress, Select, Space, Table, Tag, Timeline, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { EmptyMotion } from '../../components/reactbits/EmptyMotion'
import {
  createFollowupPlan,
  fetchFollowupPlans,
  fetchFollowupTemplates,
  updateFollowupPlan,
} from '../../services/followupService'
import type { FollowupPlan, FollowupPlanFormValues } from '../../types/followup'
import { getPlanStatusColor, getPlanStatusLabel, getTaskTypeLabel } from './followupOptions'

interface FollowupPlanPanelProps {
  patientId: number
}

interface PlanCreateFormValues {
  template_id: number
  start_date: { format: (pattern: string) => string }
}

export function FollowupPlanPanel({ patientId }: FollowupPlanPanelProps) {
  const [form] = Form.useForm<PlanCreateFormValues>()
  const [open, setOpen] = useState(false)
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const plansQuery = useQuery({
    queryKey: ['followup-plans', patientId],
    queryFn: async () => {
      const response = await fetchFollowupPlans({ page: 1, size: 20, patient_id: patientId })
      if (!response.data) {
        throw new Error(response.message || '随访计划加载失败')
      }
      return response.data
    },
  })

  const templatesQuery = useQuery({
    queryKey: ['followup-templates', 'public'],
    queryFn: async () => {
      const response = await fetchFollowupTemplates({ page: 1, size: 100, scope: 'public' })
      if (!response.data) {
        throw new Error(response.message || '模板加载失败')
      }
      return response.data.items
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: FollowupPlanFormValues) => createFollowupPlan(values),
    onSuccess: async () => {
      message.success('随访计划已创建')
      setOpen(false)
      form.resetFields()
      await queryClient.invalidateQueries({ queryKey: ['followup-plans', patientId] })
      await queryClient.invalidateQueries({ queryKey: ['patient-detail'] })
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '创建随访计划失败')
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({ planId, status }: { planId: number; status: string }) =>
      updateFollowupPlan(planId, { status }),
    onSuccess: async () => {
      message.success('计划状态已更新')
      await queryClient.invalidateQueries({ queryKey: ['followup-plans', patientId] })
    },
  })

  const columns: ColumnsType<FollowupPlan> = [
    { title: '计划名称', dataIndex: 'name' },
    {
      title: '周期',
      render: (_, record) => `${record.start_date} 至 ${record.end_date ?? '--'}`,
    },
    {
      title: '进度',
      dataIndex: 'progress_percent',
      render: (value: number) => <Progress percent={Math.round(value)} size="small" />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (value: string) => <Tag color={getPlanStatusColor(value)}>{getPlanStatusLabel(value)}</Tag>,
    },
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            disabled={record.status === 'completed'}
            onClick={() => statusMutation.mutate({ planId: record.id, status: 'completed' })}
          >
            完成
          </Button>
          <Button
            size="small"
            onClick={() =>
              statusMutation.mutate({
                planId: record.id,
                status: record.status === 'paused' ? 'active' : 'paused',
              })
            }
          >
            {record.status === 'paused' ? '恢复' : '暂停'}
          </Button>
        </Space>
      ),
    },
  ]

  const activePlan =
    plansQuery.data?.items.find((plan) => plan.status === 'active') ?? plansQuery.data?.items[0]

  function handleCreate(values: PlanCreateFormValues) {
    createMutation.mutate({
      patient_id: patientId,
      template_id: values.template_id,
      start_date: values.start_date.format('YYYY-MM-DD'),
    })
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="glucose-panel-header">
        <div>
          <Typography.Title level={4} className="panel-title">
            随访计划
          </Typography.Title>
          <Typography.Text type="secondary">模板创建计划后，会直接写入后端计划实例。</Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          制定计划
        </Button>
      </div>

      {activePlan?.template ? (
        <Card className="panel-card" title={activePlan.name}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Progress percent={Math.round(activePlan.progress_percent)} />
            <Timeline
              items={activePlan.template.stages.map((stage) => ({
                color: (activePlan.current_stage ?? 1) > stage.stage_order ? 'green' : 'blue',
                children: (
                  <div>
                    <Typography.Text strong>{stage.stage_name}</Typography.Text>
                    <div className="followup-stage-meta">
                      第 {stage.start_day_offset + 1} 天开始，持续 {stage.duration_days} 天
                    </div>
                    <Space wrap size={[6, 6]}>
                      {stage.tasks.map((task) => (
                        <Tag key={task.id}>{getTaskTypeLabel(task.task_type)}</Tag>
                      ))}
                    </Space>
                  </div>
                ),
              }))}
            />
          </Space>
        </Card>
      ) : (
        <Card className="panel-card">
          <EmptyMotion description="暂无随访计划，请从模板创建一个计划" />
        </Card>
      )}

      <Card className="panel-card" title="计划记录">
        <Table
          rowKey="id"
          loading={plansQuery.isLoading}
          columns={columns}
          dataSource={plansQuery.data?.items ?? []}
          pagination={false}
        />
      </Card>

      <Modal
        title="制定随访计划"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="随访模板" name="template_id" rules={[{ required: true, message: '请选择模板' }]}>
            <Select
              loading={templatesQuery.isLoading}
              options={(templatesQuery.data ?? []).map((template) => ({
                label: template.name,
                value: template.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="开始日期" name="start_date" rules={[{ required: true, message: '请选择开始日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}
