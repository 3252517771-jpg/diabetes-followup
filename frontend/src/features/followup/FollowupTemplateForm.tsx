import { Button, Card, Form, Input, InputNumber, Select, Space, Switch } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'

import type { FollowupTemplateFormValues } from '../../types/followup'
import { applicableTypeOptions, executorOptions, taskTypeOptions } from './followupOptions'

interface FollowupTemplateFormProps {
  initialValues: FollowupTemplateFormValues
  loading?: boolean
  onCancel: () => void
  onSubmit: (values: FollowupTemplateFormValues) => void
}

export function FollowupTemplateForm({
  initialValues,
  loading,
  onCancel,
  onSubmit,
}: FollowupTemplateFormProps) {
  return (
    <Form
      layout="vertical"
      initialValues={initialValues}
      onFinish={onSubmit}
      className="followup-template-form"
    >
      <Card className="panel-card" title="模板基础信息">
        <div className="followup-form-grid">
          <Form.Item label="模板名称" name="name" rules={[{ required: true, message: '请输入模板名称' }]}>
            <Input placeholder="例如：2型糖尿病 4 周强化随访" />
          </Form.Item>
          <Form.Item label="适用类型" name="applicable_type">
            <Select allowClear options={applicableTypeOptions} />
          </Form.Item>
          <Form.Item label="总天数" name="total_days">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="留空时按阶段自动计算" />
          </Form.Item>
          <Form.Item label="公开模板" name="is_public" valuePropName="checked">
            <Switch checkedChildren="公用" unCheckedChildren="私有" />
          </Form.Item>
          <Form.Item label="模板描述" name="description" className="followup-form-span-2">
            <Input.TextArea rows={3} placeholder="说明适用人群、节奏和注意事项" />
          </Form.Item>
        </div>
      </Card>

      <Form.List name="stages">
        {(fields, { add, remove }) => (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {fields.map((field, index) => (
              <Card
                key={field.key}
                className="panel-card"
                title={`阶段 ${index + 1}`}
                extra={
                  <Button
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => remove(field.name)}
                  />
                }
              >
                <div className="followup-stage-grid">
                  <Form.Item
                    label="阶段序号"
                    name={[field.name, 'stage_order']}
                    rules={[{ required: true, message: '请输入阶段序号' }]}
                  >
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    label="阶段名称"
                    name={[field.name, 'stage_name']}
                    rules={[{ required: true, message: '请输入阶段名称' }]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    label="开始偏移天"
                    name={[field.name, 'start_day_offset']}
                    rules={[{ required: true, message: '请输入偏移天数' }]}
                  >
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    label="持续天数"
                    name={[field.name, 'duration_days']}
                    rules={[{ required: true, message: '请输入持续天数' }]}
                  >
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </div>

                <Form.List name={[field.name, 'tasks']}>
                  {(taskFields, taskActions) => (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      {taskFields.map((taskField) => (
                        <div key={taskField.key} className="followup-task-row">
                          <Form.Item
                            name={[taskField.name, 'task_type']}
                            rules={[{ required: true, message: '请选择任务类型' }]}
                          >
                            <Select options={taskTypeOptions} placeholder="任务类型" />
                          </Form.Item>
                          <Form.Item
                            name={[taskField.name, 'executor']}
                            rules={[{ required: true, message: '请选择执行人' }]}
                          >
                            <Select options={executorOptions} placeholder="执行人" />
                          </Form.Item>
                          <Form.Item name={[taskField.name, 'frequency']}>
                            <Input placeholder="频次，如 daily / weekly" />
                          </Form.Item>
                          <Form.Item name={[taskField.name, 'remind_before_minutes']}>
                            <InputNumber min={0} style={{ width: '100%' }} placeholder="提前分钟" />
                          </Form.Item>
                          <Form.Item name={[taskField.name, 'description']}>
                            <Input placeholder="任务说明" />
                          </Form.Item>
                          <Button
                            danger
                            type="text"
                            icon={<DeleteOutlined />}
                            onClick={() => taskActions.remove(taskField.name)}
                          />
                        </div>
                      ))}
                      <Button
                        icon={<PlusOutlined />}
                        onClick={() =>
                          taskActions.add({
                            task_type: 'blood_glucose',
                            executor: 'patient',
                            frequency: 'daily',
                            remind_before_minutes: 30,
                            description: null,
                          })
                        }
                      >
                        添加任务
                      </Button>
                    </Space>
                  )}
                </Form.List>
              </Card>
            ))}
            <Button
              icon={<PlusOutlined />}
              onClick={() =>
                add({
                  stage_order: fields.length + 1,
                  stage_name: '新阶段',
                  start_day_offset: 0,
                  duration_days: 7,
                  tasks: [],
                })
              }
            >
              添加阶段
            </Button>
          </Space>
        )}
      </Form.List>

      <Card className="panel-card">
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存模板
          </Button>
        </Space>
      </Card>
    </Form>
  )
}
