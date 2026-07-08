import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Card, Empty, Form, Input, Space, Typography } from 'antd'
import { useEffect } from 'react'

import { QueryStateAlert } from '../components/QueryStateAlert'
import { useAuth } from '../hooks/useAuth'
import { fetchSystemConfigs, updateSystemConfigs } from '../services/systemService'

export function SystemConfigPage() {
  const { message } = App.useApp()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const isAdmin = user?.roles.includes('admin') ?? false

  const configQuery = useQuery({
    queryKey: ['system-configs'],
    enabled: isAdmin,
    queryFn: async () => {
      const response = await fetchSystemConfigs()
      if (!response.data) {
        throw new Error(response.message || '系统配置加载失败')
      }
      return response.data
    },
  })

  useEffect(() => {
    if (!configQuery.data) {
      return
    }

    form.setFieldsValue({
      items: configQuery.data.map((item) => ({
        config_key: item.config_key,
        config_value: item.config_value,
        description: item.description,
      })),
    })
  }, [configQuery.data, form])

  const updateMutation = useMutation({
    mutationFn: updateSystemConfigs,
    onSuccess: async () => {
      message.success('系统配置已更新')
      await queryClient.invalidateQueries({ queryKey: ['system-configs'] })
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '系统配置更新失败')
    },
  })

  if (!isAdmin) {
    return (
      <Card className="panel-card">
        <Empty description="当前账号没有系统配置权限" />
      </Card>
    )
  }

  return (
    <div className="page-shell">
      <div className="page-toolbar">
        <Typography.Text className="dashboard-kicker">System</Typography.Text>
        <Typography.Title level={2} className="panel-title">
          系统配置
        </Typography.Title>
        <Typography.Paragraph className="panel-subtitle">
          用于维护推送、血糖目标和 AI 推荐等全局参数。
        </Typography.Paragraph>
      </div>

      <Card className="panel-card" loading={configQuery.isLoading}>
        {configQuery.isError ? (
          <QueryStateAlert
            title="系统配置加载失败"
            description={configQuery.error.message}
            onRetry={() => void configQuery.refetch()}
          />
        ) : null}

        <Form
          disabled={configQuery.isError}
          form={form}
          layout="vertical"
          onFinish={async (values: { items: Array<{ config_key: string; config_value: string; description?: string }> }) => {
            await updateMutation.mutateAsync(values.items)
          }}
        >
          <Form.List name="items">
            {(fields) => (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {fields.map((field) => (
                  <Card key={field.key} size="small" className="config-item-card">
                    <Form.Item
                      label="配置键"
                      name={[field.name, 'config_key']}
                      rules={[{ required: true, message: '请输入配置键' }]}
                    >
                      <Input disabled />
                    </Form.Item>
                    <Form.Item
                      label="配置值"
                      name={[field.name, 'config_value']}
                      rules={[{ required: true, message: '请输入配置值' }]}
                    >
                      <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
                    </Form.Item>
                    <Form.Item label="说明" name={[field.name, 'description']}>
                      <Input placeholder="可选说明" />
                    </Form.Item>
                  </Card>
                ))}
              </Space>
            )}
          </Form.List>

          <div className="config-actions">
            <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
              保存配置
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  )
}
