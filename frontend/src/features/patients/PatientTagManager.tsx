import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { App, Button, Form, Input, Modal, Space, Table, Tag } from 'antd'

import { createTag, updateTag } from '../../services/patientService'
import type { PatientTag } from '../../types/patient'

interface PatientTagManagerProps {
  tags: PatientTag[]
  open: boolean
  onClose: () => void
}

interface TagFormValues {
  name: string
  color: string | null
}

export function PatientTagManager({ tags, open, onClose }: PatientTagManagerProps) {
  const [form] = Form.useForm<TagFormValues>()
  const [editingTag, setEditingTag] = useState<PatientTag | null>(null)
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  const saveMutation = useMutation({
    mutationFn: async (values: TagFormValues) => {
      if (editingTag) {
        return updateTag(editingTag.id, values)
      }
      return createTag(values)
    },
    onSuccess: async () => {
      message.success(editingTag ? '标签已更新' : '标签已创建')
      form.resetFields()
      setEditingTag(null)
      await queryClient.invalidateQueries({ queryKey: ['patient-tags'] })
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '保存标签失败')
    },
  })

  function handleEdit(tag: PatientTag) {
    setEditingTag(tag)
    form.setFieldsValue({ name: tag.name, color: tag.color })
  }

  async function handleFinish(values: TagFormValues) {
    await saveMutation.mutateAsync(values)
  }

  return (
    <Modal
      title="标签管理"
      open={open}
      onCancel={() => {
        onClose()
        setEditingTag(null)
        form.resetFields()
      }}
      footer={null}
      width={720}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Space.Compact block>
          <Form.Item
            name="name"
            rules={[{ required: true, message: '请输入标签名称' }]}
            style={{ flex: 1, marginBottom: 0 }}
          >
            <Input placeholder="标签名称" />
          </Form.Item>
          <Form.Item name="color" style={{ width: 160, marginBottom: 0 }}>
            <Input placeholder="#2563EB" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
            {editingTag ? '更新标签' : '新建标签'}
          </Button>
        </Space.Compact>
      </Form>

      <Table
        rowKey="id"
        className="tag-manager-table"
        pagination={false}
        dataSource={tags}
        columns={[
          {
            title: '标签',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, record: PatientTag) => (
              <Tag color={record.color ?? 'default'}>{name}</Tag>
            ),
          },
          {
            title: '颜色',
            dataIndex: 'color',
            key: 'color',
            render: (value: string | null) => value ?? '--',
          },
          {
            title: '操作',
            key: 'actions',
            render: (_: unknown, record: PatientTag) => (
              <Button type="link" onClick={() => handleEdit(record)}>
                编辑
              </Button>
            ),
          },
        ]}
      />
    </Modal>
  )
}
