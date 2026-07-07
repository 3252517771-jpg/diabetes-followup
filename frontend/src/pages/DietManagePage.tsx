import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useSearchParams } from 'react-router-dom'

import { AnimatedTitle } from '../components/reactbits/AnimatedTitle'
import { EmptyMotion } from '../components/reactbits/EmptyMotion'
import {
  approveDietRecommendation,
  fetchDietRecommendation,
  fetchDietRecommendations,
  generateDietRecommendation,
  rejectDietRecommendation,
} from '../services/dietService'
import { fetchPatients } from '../services/patientService'
import type { DietRecommendation } from '../types/diet'

interface GenerateFormValues {
  patient_id: number
  preferred_calories?: number
  additional_prompt?: string
}

const reviewStatusColor = {
  pending: 'gold',
  approved: 'blue',
  rejected: 'red',
} as const

const reviewStatusLabel = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
} as const

export function DietManagePage() {
  const [searchParams] = useSearchParams()
  const initialPatientId = Number(searchParams.get('patientId') || '') || undefined
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [patientFilter, setPatientFilter] = useState<number | undefined>(initialPatientId)
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<number | null>(null)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [reviewComment, setReviewComment] = useState('')
  const [generateForm] = Form.useForm<GenerateFormValues>()
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const recommendationsQuery = useQuery({
    queryKey: ['diet-recommendations', statusFilter, patientFilter],
    queryFn: async () => {
      const response = await fetchDietRecommendations({
        page: 1,
        size: 50,
        status: statusFilter,
        patient_id: patientFilter,
      })
      if (!response.data) {
        throw new Error(response.message || '饮食推荐加载失败')
      }
      return response.data
    },
  })

  const patientsQuery = useQuery({
    queryKey: ['diet-patient-options'],
    queryFn: async () => {
      const response = await fetchPatients({ page: 1, size: 100 })
      if (!response.data) {
        throw new Error(response.message || '患者列表加载失败')
      }
      return response.data.items
    },
  })

  const detailQuery = useQuery({
    queryKey: ['diet-recommendation-detail', selectedRecommendationId],
    enabled: selectedRecommendationId !== null,
    queryFn: async () => {
      const response = await fetchDietRecommendation(selectedRecommendationId as number)
      if (!response.data) {
        throw new Error(response.message || '推荐详情加载失败')
      }
      return response.data
    },
  })

  const generateMutation = useMutation({
    mutationFn: generateDietRecommendation,
    onSuccess: async () => {
      message.success('已生成新的 AI 饮食推荐')
      setGenerateOpen(false)
      generateForm.resetFields()
      await queryClient.invalidateQueries({ queryKey: ['diet-recommendations'] })
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (error: Error) => {
      message.error(error.message)
    },
  })

  const approveMutation = useMutation({
    mutationFn: (recommendationId: number) =>
      approveDietRecommendation(recommendationId, {
        review_comment: reviewComment || undefined,
      }),
    onSuccess: async () => {
      message.success('推荐已通过并触发推送')
      setReviewComment('')
      await queryClient.invalidateQueries({ queryKey: ['diet-recommendations'] })
      await queryClient.invalidateQueries({ queryKey: ['diet-recommendation-detail'] })
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (error: Error) => {
      message.error(error.message)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (recommendationId: number) =>
      rejectDietRecommendation(recommendationId, {
        review_comment: reviewComment || undefined,
      }),
    onSuccess: async () => {
      message.success('推荐已驳回')
      setReviewComment('')
      await queryClient.invalidateQueries({ queryKey: ['diet-recommendations'] })
      await queryClient.invalidateQueries({ queryKey: ['diet-recommendation-detail'] })
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (error: Error) => {
      message.error(error.message)
    },
  })

  const items = recommendationsQuery.data?.items ?? []
  const metrics = {
    total: items.length,
    approved: items.filter((item) => item.review_status === 'approved').length,
    pending: items.filter((item) => item.review_status === 'pending').length,
    pushed: items.filter((item) => item.push_status === 'pushed').length,
  }

  const columns: ColumnsType<DietRecommendation> = [
    {
      title: '患者',
      dataIndex: 'patient_name',
    },
    {
      title: '生成时间',
      dataIndex: 'created_at',
      render: (value: string) => value.replace('T', ' ').slice(0, 16),
    },
    {
      title: '热量',
      render: (_, record) => `${record.content.total_calories} kcal`,
    },
    {
      title: '状态',
      dataIndex: 'review_status',
      render: (value: DietRecommendation['review_status']) => (
        <Tag color={reviewStatusColor[value]}>{reviewStatusLabel[value]}</Tag>
      ),
    },
    {
      title: '推送',
      dataIndex: 'push_status',
      render: (value: DietRecommendation['push_status']) => (
        <Tag color={value === 'pushed' ? 'blue' : value === 'failed' ? 'red' : 'default'}>{value}</Tag>
      ),
    },
    {
      title: '操作',
      render: (_, record) => (
        <Button size="small" onClick={() => setSelectedRecommendationId(record.id)}>
          {record.review_status === 'pending' ? '审核' : '查看'}
        </Button>
      ),
    },
  ]

  return (
    <div className="page-shell">
      <div className="page-toolbar followup-toolbar">
        <div>
          <Typography.Text className="dashboard-kicker">Diet</Typography.Text>
          <Typography.Title level={2} className="panel-title">
            <AnimatedTitle>饮食推荐管理</AnimatedTitle>
          </Typography.Title>
          <Typography.Paragraph className="panel-subtitle">
            直接调用 FastAPI 与 DeepSeek 生成推荐，审核通过后同步触发患者推送与消息回流。
          </Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setGenerateOpen(true)}>
          新建推荐
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card className="metric-card">
            <Statistic title="当前筛选总数" value={metrics.total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="metric-card">
            <Statistic title="待审核" value={metrics.pending} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="metric-card">
            <Statistic title="已通过" value={metrics.approved} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="metric-card">
            <Statistic title="已推送" value={metrics.pushed} />
          </Card>
        </Col>
      </Row>

      <Card className="panel-card">
        <div className="diet-filter-row">
          <Space wrap>
            <Select
              value={statusFilter}
              style={{ width: 160 }}
              options={[
                { label: '待审核', value: 'pending' },
                { label: '已通过', value: 'approved' },
                { label: '已驳回', value: 'rejected' },
              ]}
              onChange={(value) => setStatusFilter(value)}
            />
            <Select
              allowClear
              placeholder="按患者筛选"
              value={patientFilter}
              style={{ width: 220 }}
              options={(patientsQuery.data ?? []).map((patient) => ({
                label: patient.name,
                value: patient.id,
              }))}
              onChange={(value) => setPatientFilter(value)}
            />
          </Space>
        </div>

        {items.length ? (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={items}
            loading={recommendationsQuery.isLoading}
            pagination={false}
          />
        ) : (
          <EmptyMotion description={recommendationsQuery.isLoading ? '推荐加载中' : '当前筛选下暂无推荐'} />
        )}
      </Card>

      <Modal
        title="生成 AI 饮食推荐"
        open={generateOpen}
        onCancel={() => setGenerateOpen(false)}
        onOk={() => generateForm.submit()}
        confirmLoading={generateMutation.isPending}
        okText="生成推荐"
      >
        <Form
          form={generateForm}
          layout="vertical"
          initialValues={{ patient_id: patientFilter }}
          onFinish={(values) => generateMutation.mutate(values)}
        >
          <Form.Item label="患者" name="patient_id" rules={[{ required: true, message: '请选择患者' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={(patientsQuery.data ?? []).map((patient) => ({
                label: patient.name,
                value: patient.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="目标热量 (kcal)" name="preferred_calories">
            <InputNumber min={800} max={3500} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="补充说明" name="additional_prompt">
            <Input.TextArea rows={4} placeholder="例如：近期空腹血糖偏高，偏好清淡家常菜" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="推荐审核"
        open={selectedRecommendationId !== null}
        width={560}
        onClose={() => {
          setSelectedRecommendationId(null)
          setReviewComment('')
        }}
      >
        {detailQuery.data ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={reviewStatusColor[detailQuery.data.review_status]}>
                {reviewStatusLabel[detailQuery.data.review_status]}
              </Tag>
              <Tag>{detailQuery.data.push_status}</Tag>
              <Typography.Text type="secondary">
                {detailQuery.data.patient_name}
              </Typography.Text>
            </Space>

            <Card size="small" className="panel-card">
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {detailQuery.data.content.meals.map((meal) => (
                  <div key={meal.meal_type}>
                    <Typography.Text strong>{meal.meal_type}</Typography.Text>
                    <Typography.Paragraph style={{ margin: '6px 0 4px' }}>
                      {meal.foods.join('、')}
                    </Typography.Paragraph>
                    <Typography.Text type="secondary">{meal.tips}</Typography.Text>
                  </div>
                ))}
              </Space>
            </Card>

            <Card size="small" className="panel-card">
              <Space direction="vertical" size={8}>
                <Typography.Text strong>
                  总热量 {detailQuery.data.content.total_calories} kcal
                </Typography.Text>
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                  {detailQuery.data.content.notes || '暂无备注'}
                </Typography.Paragraph>
                <Typography.Text type="secondary">
                  推送目标：{detailQuery.data.push_target_label}
                </Typography.Text>
                <Typography.Text type="secondary">
                  当前推送状态：{detailQuery.data.push_status}
                </Typography.Text>
                {detailQuery.data.reviewer_name ? (
                  <Typography.Text type="secondary">
                    审核人：{detailQuery.data.reviewer_name}
                  </Typography.Text>
                ) : null}
              </Space>
            </Card>

            <Input.TextArea
              rows={4}
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              placeholder="填写审核意见，可选"
            />

            {detailQuery.data.review_status === 'pending' ? (
              <Space>
                <Button
                  danger
                  onClick={() => rejectMutation.mutate(detailQuery.data?.id ?? 0)}
                  loading={rejectMutation.isPending}
                >
                  驳回
                </Button>
                <Button
                  type="primary"
                  onClick={() => approveMutation.mutate(detailQuery.data?.id ?? 0)}
                  loading={approveMutation.isPending}
                >
                  通过并推送
                </Button>
              </Space>
            ) : null}
          </Space>
        ) : (
          <EmptyMotion description={detailQuery.isLoading ? '详情加载中' : '未找到推荐详情'} />
        )}
      </Drawer>
    </div>
  )
}
