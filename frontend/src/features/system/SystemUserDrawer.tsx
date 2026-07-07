import { Button, Drawer, Form, Input, Select, Switch } from 'antd'
import { useEffect } from 'react'

import type {
  SystemUser,
  SystemUserCreatePayload,
  SystemUserUpdatePayload,
} from '../../types/system'

interface SystemUserDrawerProps {
  open: boolean
  user?: SystemUser | null
  loading: boolean
  onClose: () => void
  onSubmit: (values: SystemUserCreatePayload | SystemUserUpdatePayload) => Promise<void>
}

const roleOptions = [
  { label: '管理员', value: 'admin' },
  { label: '科主任', value: 'director' },
  { label: '医生', value: 'doctor' },
  { label: '护士', value: 'nurse' },
  { label: '营养师', value: 'nutritionist' },
]

export function SystemUserDrawer({
  open,
  user,
  loading,
  onClose,
  onSubmit,
}: SystemUserDrawerProps) {
  const [form] = Form.useForm()
  const isEdit = Boolean(user)

  useEffect(() => {
    if (!open) {
      form.resetFields()
      return
    }

    if (user) {
      form.setFieldsValue({
        username: user.username,
        real_name: user.real_name,
        phone: user.phone,
        department: user.department,
        role_code: user.role_code,
        status: user.status === 1,
      })
      return
    }

    form.setFieldsValue({
      role_code: 'doctor',
      status: true,
    })
  }, [form, open, user])

  return (
    <Drawer
      title={isEdit ? '编辑用户' : '新建用户'}
      width={420}
      open={open}
      onClose={onClose}
      destroyOnClose
      extra={
        <Button type="primary" loading={loading} onClick={() => form.submit()}>
          保存
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={async (values) => {
          await onSubmit({
            ...values,
            status: values.status ? 1 : 0,
          })
        }}
      >
        <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
          <Input disabled={isEdit} placeholder="例如 doctor02" />
        </Form.Item>
        {!isEdit ? (
          <Form.Item label="初始密码" name="password" rules={[{ required: true, message: '请输入初始密码' }]}>
            <Input.Password placeholder="不少于 6 位" />
          </Form.Item>
        ) : null}
        <Form.Item label="姓名" name="real_name" rules={[{ required: true, message: '请输入姓名' }]}>
          <Input placeholder="请输入姓名" />
        </Form.Item>
        <Form.Item label="手机号" name="phone">
          <Input placeholder="选填" />
        </Form.Item>
        <Form.Item label="科室" name="department">
          <Input placeholder="例如 内分泌科" />
        </Form.Item>
        <Form.Item label="角色" name="role_code" rules={[{ required: true, message: '请选择角色' }]}>
          <Select options={roleOptions} />
        </Form.Item>
        <Form.Item label="启用状态" name="status" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
