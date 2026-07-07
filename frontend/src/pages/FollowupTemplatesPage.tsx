import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Card, Input, Segmented, Space, Tag, Typography } from 'antd'
import { CopyOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

import { AnimatedTitle } from '../components/reactbits/AnimatedTitle'
import { EmptyMotion } from '../components/reactbits/EmptyMotion'
import { ROUTE_PATHS } from '../config/routes'
import {
  copyFollowupTemplate,
  deleteFollowupTemplate,
  fetchFollowupTemplates,
} from '../services/followupService'

export function FollowupTemplatesPage() {
  const [scope, setScope] = useState<'public' | 'mine'>('public')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message, modal } = App.useApp()

  const templateQuery = useQuery({
    queryKey: ['followup-templates', scope, search],
    queryFn: async () => {
      const response = await fetchFollowupTemplates({ page: 1, size: 30, scope, search })
      if (!response.data) {
        throw new Error(response.message || '模板加载失败')
      }
      return response.data
    },
  })

  const copyMutation = useMutation({
    mutationFn: copyFollowupTemplate,
    onSuccess: async () => {
      message.success('模板已复制到我的模板')
      await queryClient.invalidateQueries({ queryKey: ['followup-templates'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFollowupTemplate,
    onSuccess: async () => {
      message.success('模板已删除')
      await queryClient.invalidateQueries({ queryKey: ['followup-templates'] })
    },
  })

  function confirmDelete(templateId: number) {
    modal.confirm({
      title: '确认删除模板？',
      content: '已被计划引用的模板会自动停用，不会破坏历史计划。',
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(templateId),
    })
  }

  return (
    <div className="page-shell">
      <div className="page-toolbar followup-toolbar">
        <div>
          <Typography.Text className="dashboard-kicker">Followup</Typography.Text>
          <Typography.Title level={2} className="panel-title">
            <AnimatedTitle>随访计划模板</AnimatedTitle>
          </Typography.Title>
          <Typography.Paragraph className="panel-subtitle">
            模板、阶段和任务项均来自真实后端接口，制定计划时直接生成患者计划实例。
          </Typography.Paragraph>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate(ROUTE_PATHS.followupTemplateCreate)}
        >
          新建模板
        </Button>
      </div>

      <Card className="panel-card">
        <div className="followup-filter-row">
          <Segmented
            value={scope}
            options={[
              { label: '公用模板', value: 'public' },
              { label: '我的模板', value: 'mine' },
            ]}
            onChange={(value) => setScope(value as 'public' | 'mine')}
          />
          <Input.Search
            allowClear
            placeholder="搜索模板名称"
            style={{ maxWidth: 320 }}
            onSearch={setSearch}
          />
        </div>

        {templateQuery.data?.items.length ? (
          <div className="template-grid">
            {templateQuery.data.items.map((template) => (
              <Card key={template.id} className="template-card">
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div>
                    <Typography.Title level={4} className="template-card__title">
                      {template.name}
                    </Typography.Title>
                    <Typography.Paragraph className="template-card__desc">
                      {template.description || '暂无模板说明'}
                    </Typography.Paragraph>
                  </div>
                  <Space wrap>
                    <Tag color={template.is_public ? 'blue' : 'default'}>
                      {template.is_public ? '公用' : '私有'}
                    </Tag>
                    <Tag>{template.stage_count} 个阶段</Tag>
                    <Tag>{template.task_count} 个任务</Tag>
                    <Tag>{template.total_days ?? '--'} 天</Tag>
                  </Space>
                  <Space>
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => navigate(`/followup/templates/${template.id}`)}
                    >
                      编辑
                    </Button>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyMutation.mutate(template.id)}
                    >
                      复制
                    </Button>
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => confirmDelete(template.id)}
                    >
                      删除
                    </Button>
                  </Space>
                </Space>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyMotion description={templateQuery.isLoading ? '模板加载中' : '暂无随访模板'} />
        )}
      </Card>
    </div>
  )
}
