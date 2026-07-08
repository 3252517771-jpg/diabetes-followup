import { useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { App, Card, Typography } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'

import { QueryStateAlert } from '../components/QueryStateAlert'
import { AnimatedTitle } from '../components/reactbits/AnimatedTitle'
import { ROUTE_PATHS } from '../config/routes'
import { FollowupTemplateForm } from '../features/followup/FollowupTemplateForm'
import {
  createFollowupTemplate,
  fetchFollowupTemplate,
  updateFollowupTemplate,
} from '../services/followupService'
import type { FollowupTemplateFormValues } from '../types/followup'

const defaultValues: FollowupTemplateFormValues = {
  name: '',
  description: null,
  applicable_type: 'Type2',
  total_days: null,
  is_public: true,
  is_active: true,
  stages: [
    {
      stage_order: 1,
      stage_name: '强化记录期',
      start_day_offset: 0,
      duration_days: 14,
      tasks: [
        {
          task_type: 'blood_glucose',
          executor: 'patient',
          frequency: 'daily',
          remind_before_minutes: 30,
          description: '每日记录空腹血糖',
        },
      ],
    },
  ],
}

export function TemplateEditorPage() {
  const { id } = useParams()
  const isCreate = !id
  const templateId = Number(id)
  const navigate = useNavigate()
  const { message } = App.useApp()

  const templateQuery = useQuery({
    queryKey: ['followup-template', id],
    enabled: !isCreate && Number.isFinite(templateId),
    queryFn: async () => {
      const response = await fetchFollowupTemplate(templateId)
      if (!response.data) {
        throw new Error(response.message || '模板详情加载失败')
      }
      return response.data
    },
  })

  const initialValues = useMemo<FollowupTemplateFormValues>(() => {
    if (!templateQuery.data) {
      return defaultValues
    }
    return {
      name: templateQuery.data.name,
      description: templateQuery.data.description,
      applicable_type: templateQuery.data.applicable_type,
      total_days: templateQuery.data.total_days,
      is_public: templateQuery.data.is_public,
      is_active: templateQuery.data.is_active,
      stages: templateQuery.data.stages.map((stage) => ({
        stage_order: stage.stage_order,
        stage_name: stage.stage_name,
        start_day_offset: stage.start_day_offset,
        duration_days: stage.duration_days,
        tasks: stage.tasks.map((task) => ({
          task_type: task.task_type,
          executor: task.executor,
          frequency: task.frequency,
          remind_before_minutes: task.remind_before_minutes,
          description: task.description,
        })),
      })),
    }
  }, [templateQuery.data])

  const saveMutation = useMutation({
    mutationFn: async (values: FollowupTemplateFormValues) => {
      const payload = normalizeTemplatePayload(values)
      if (isCreate) {
        return createFollowupTemplate(payload)
      }
      return updateFollowupTemplate(templateId, payload)
    },
    onSuccess: (response) => {
      message.success(isCreate ? '模板已创建' : '模板已更新')
      navigate(response.data ? `/followup/templates/${response.data.id}` : ROUTE_PATHS.followupTemplates)
    },
    onError: (error) => {
      message.error(getRequestErrorMessage(error, '保存模板失败'))
    },
  })

  return (
    <div className="page-shell">
      <div className="page-toolbar">
        <Typography.Text className="dashboard-kicker">Template</Typography.Text>
        <Typography.Title level={2} className="panel-title">
          <AnimatedTitle>{isCreate ? '新建随访模板' : '编辑随访模板'}</AnimatedTitle>
        </Typography.Title>
        <Typography.Paragraph className="panel-subtitle">
          阶段与任务保存后会同步写入 FastAPI，不使用本地假数据。
        </Typography.Paragraph>
      </div>

      {templateQuery.isLoading ? (
        <Card loading className="panel-card" />
      ) : templateQuery.isError ? (
        <Card className="panel-card">
          <QueryStateAlert
            title="模板详情加载失败"
            description={templateQuery.error.message}
            onRetry={() => void templateQuery.refetch()}
          />
        </Card>
      ) : (
        <FollowupTemplateForm
          key={templateQuery.data?.id ?? 'create'}
          initialValues={initialValues}
          loading={saveMutation.isPending}
          onCancel={() => navigate(ROUTE_PATHS.followupTemplates)}
          onSubmit={(values) => saveMutation.mutate(values)}
        />
      )}
    </div>
  )
}

function normalizeTemplatePayload(values: FollowupTemplateFormValues): FollowupTemplateFormValues {
  return {
    ...values,
    name: values.name.trim(),
    description: values.description?.trim() || null,
    applicable_type: values.applicable_type || null,
    total_days: values.total_days ?? null,
    is_public: Boolean(values.is_public),
    is_active: values.is_active ?? true,
    stages: values.stages.map((stage, stageIndex) => ({
      stage_order: stage.stage_order ?? stageIndex + 1,
      stage_name: stage.stage_name.trim(),
      start_day_offset: stage.start_day_offset ?? 0,
      duration_days: stage.duration_days ?? 1,
      tasks: stage.tasks.map((task) => ({
        task_type: task.task_type,
        executor: task.executor,
        frequency: task.frequency?.trim() || null,
        remind_before_minutes: task.remind_before_minutes ?? 0,
        description: task.description?.trim() || null,
      })),
    })),
  }
}

function getRequestErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as {
      response?: { data?: { detail?: Array<{ msg?: string; loc?: Array<string | number> }> | string; message?: string } }
      message?: string
    }).response
    const detail = response?.data?.detail
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0]
      const path = Array.isArray(first.loc) ? first.loc.join('.') : 'request'
      return `${path}: ${first.msg ?? fallback}`
    }
    if (typeof detail === 'string' && detail) {
      return detail
    }
    if (response?.data?.message) {
      return response.data.message
    }
  }
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}
