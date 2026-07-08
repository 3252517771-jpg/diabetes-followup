import { useMemo, useState } from 'react'
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

import { PageIntro } from '../components/PageIntro'
import { QueryStateAlert } from '../components/QueryStateAlert'
import { ScrollStack, ScrollStackItem } from '../components/reactbits/ScrollStack'
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

const pushStatusColor = {
  unpushed: 'default',
  pushed: 'blue',
  failed: 'red',
} as const

const pushStatusLabel = {
  unpushed: '未推送',
  pushed: '已推送',
  failed: '推送失败',
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
      title: '审核状态',
      dataIndex: 'review_status',
      render: (value: DietRecommendation['review_status']) => (
        <Tag color={reviewStatusColor[value]}>{reviewStatusLabel[value]}</Tag>
      ),
    },
    {
      title: '推送状态',
      dataIndex: 'push_status',
      render: (value: DietRecommendation['push_status']) => (
        <Tag color={pushStatusColor[value]}>{pushStatusLabel[value]}</Tag>
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

  const detail = detailQuery.data

  const reviewLayers = useMemo(() => {
    if (!detail) {
      return []
    }

    return [
      {
        key: 'overview',
        title: '患者与推荐概览',
        content: (
          <Card
            size="small"
            className="panel-card diet-review-card"
            title="患者与推荐概览"
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={reviewStatusColor[detail.review_status]}>
                  {reviewStatusLabel[detail.review_status]}
                </Tag>
                <Tag color={pushStatusColor[detail.push_status]}>
                  {pushStatusLabel[detail.push_status]}
                </Tag>
              </Space>
              <div className="diet-review-summary-list">
                <div className="diet-review-summary-item">
                  <span className="diet-review-summary-item__label">患者</span>
                  <strong className="diet-review-summary-item__value">{detail.patient_name ?? '--'}</strong>
                </div>
                <div className="diet-review-summary-item">
                  <span className="diet-review-summary-item__label">生成方式</span>
                  <strong className="diet-review-summary-item__value">{detail.generate_method}</strong>
                </div>
                <div className="diet-review-summary-item">
                  <span className="diet-review-summary-item__label">创建时间</span>
                  <strong className="diet-review-summary-item__value">
                    {detail.created_at.replace('T', ' ').slice(0, 16)}
                  </strong>
                </div>
              </div>
            </Space>
          </Card>
        ),
      },
      {
        key: 'meals',
        title: '餐次拆解',
        content: (
          <Card size="small" className="panel-card diet-review-card" title="餐次拆解">
            <Space direction="vertical" size={14} style={{ width: '100%' }}>
              {detail.content.meals.map((meal) => (
                <div key={meal.meal_type} className="diet-review-meal">
                  <div className="diet-review-meal__head">
                    <Typography.Text strong>{meal.meal_type}</Typography.Text>
                  </div>
                  <Typography.Paragraph className="diet-review-meal__foods">
                    {meal.foods.join('、')}
                  </Typography.Paragraph>
                  <Typography.Text type="secondary">{meal.tips}</Typography.Text>
                </div>
              ))}
            </Space>
          </Card>
        ),
      },
      {
        key: 'nutrition',
        title: '营养摘要',
        content: (
          <Card size="small" className="panel-card diet-review-card" title="营养摘要">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div className="diet-review-stat">
                <span className="diet-review-stat__label">总热量</span>
                <strong className="diet-review-stat__value">{detail.content.total_calories} kcal</strong>
              </div>
              <div className="diet-review-note">
                <Typography.Text strong>备注</Typography.Text>
                <Typography.Paragraph className="diet-review-note__text">
                  {detail.content.notes || '暂无备注'}
                </Typography.Paragraph>
              </div>
            </Space>
          </Card>
        ),
      },
      {
        key: 'push',
        title: '推送信息',
        content: (
          <Card size="small" className="panel-card diet-review-card" title="推送信息">
            <div className="diet-review-summary-list">
              <div className="diet-review-summary-item">
                <span className="diet-review-summary-item__label">推送目标</span>
                <strong className="diet-review-summary-item__value">{detail.push_target_label}</strong>
              </div>
              <div className="diet-review-summary-item">
                <span className="diet-review-summary-item__label">推送状态</span>
                <strong className="diet-review-summary-item__value">{pushStatusLabel[detail.push_status]}</strong>
              </div>
              <div className="diet-review-summary-item">
                <span className="diet-review-summary-item__label">审核人</span>
                <strong className="diet-review-summary-item__value">{detail.reviewer_name ?? '--'}</strong>
              </div>
            </div>
          </Card>
        ),
      },
      {
        key: 'review',
        title: '审核决策',
        content: (
          <Card size="small" className="panel-card diet-review-card" title="审核决策">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Input.TextArea
                rows={5}
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                placeholder="填写审核意见，可选"
              />

              {detail.review_status === 'pending' ? (
                <Space>
                  <Button
                    danger
                    onClick={() => rejectMutation.mutate(detail.id)}
                    loading={rejectMutation.isPending}
                  >
                    驳回
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => approveMutation.mutate(detail.id)}
                    loading={approveMutation.isPending}
                  >
                    通过并推送
                  </Button>
                </Space>
              ) : (
                <Typography.Text type="secondary">
                  当前推荐已完成审核，若需重新生成，请返回列表新建推荐。
                </Typography.Text>
              )}
            </Space>
          </Card>
        ),
      },
    ]
  }, [approveMutation, detail, rejectMutation, reviewComment])

  return (
    <div className="page-shell page-shell--dashboard">
      <PageIntro
        kicker="Diet"
        title="饮食推荐管理"
        description="直接调用真实 FastAPI 与 DeepSeek 推荐链路。列表保持克制，审核详情升级为分层审阅结构。"
      />

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
        {recommendationsQuery.isError || patientsQuery.isError ? (
          <QueryStateAlert
            title="饮食推荐数据加载失败"
            description={
              recommendationsQuery.error?.message ??
              patientsQuery.error?.message ??
              '请稍后重试'
            }
            onRetry={() => {
              void recommendationsQuery.refetch()
              void patientsQuery.refetch()
            }}
          />
        ) : null}

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

          <Button type="primary" icon={<PlusOutlined />} onClick={() => setGenerateOpen(true)}>
            新建推荐
          </Button>
        </div>

        {!recommendationsQuery.isError && items.length ? (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={items}
            loading={recommendationsQuery.isLoading}
            pagination={false}
          />
        ) : !recommendationsQuery.isError ? (
          <EmptyMotion
            description={recommendationsQuery.isLoading ? '推荐加载中' : '当前筛选下暂无推荐'}
          />
        ) : null}
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
          <Form.Item
            label="患者"
            name="patient_id"
            rules={[{ required: true, message: '请选择患者' }]}
          >
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
        width={640}
        onClose={() => {
          setSelectedRecommendationId(null)
          setReviewComment('')
        }}
      >
        {detailQuery.isError ? (
          <QueryStateAlert
            title="推荐详情加载失败"
            description={detailQuery.error.message}
            onRetry={() => void detailQuery.refetch()}
          />
        ) : detail ? (
          <div className="diet-review-scroll">
            <ScrollStack measureSelector=".diet-review-card">
              {reviewLayers.map((layer, index) => (
                <ScrollStackItem key={layer.key} index={index} className="diet-review-stack-item">
                  <div className="diet-review-stage">{layer.content}</div>
                </ScrollStackItem>
              ))}
            </ScrollStack>
          </div>
        ) : (
          <EmptyMotion description={detailQuery.isLoading ? '详情加载中' : '未找到推荐详情'} />
        )}
      </Drawer>
    </div>
  )
}
