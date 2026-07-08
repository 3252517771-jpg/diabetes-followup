import { Alert, Button, Form, Input, Typography } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

import { AuthLayout } from '../components/layout/AuthLayout'
import { ProfileCard } from '../components/reactbits/ProfileCard'
import { ROUTE_PATHS } from '../config/routes'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFinish(values: { username: string; password: string }) {
    setSubmitting(true)
    setError(null)
    try {
      await login(values.username, values.password)
      navigate(ROUTE_PATHS.dashboard)
    } catch (loginError) {
      if (loginError instanceof Error) {
        setError(loginError.message)
      } else {
        setError('登录失败，请稍后重试')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="login-shell">
        <ProfileCard
          name="Diabetes Followup"
          roleLabel="Clinical Console"
          departmentLabel="Endocrinology collaborative workspace"
          quote="Structured followup, glucose review, and nutrition decisions in one careful flow."
          accentLabel="Medical workspace"
        >
          <div className="login-card__head">
            <Typography.Text className="login-kicker">Dub-style Medical Console</Typography.Text>
            <Typography.Title level={2} className="login-title">
              医护登录
            </Typography.Title>
            <Typography.Paragraph className="login-subtitle">
              请输入已分配的正式账号信息登录系统。
            </Typography.Paragraph>
          </div>

          <Typography.Paragraph className="login-caption">
            Quiet tools for daily followup.
          </Typography.Paragraph>

          {error ? <Alert type="error" message={error} showIcon closable /> : null}

          <Form layout="vertical" size="large" onFinish={handleFinish}>
            <Form.Item
              label="用户名"
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="请输入用户名" autoComplete="username" />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={submitting}>
              登录系统
            </Button>
          </Form>
        </ProfileCard>
      </div>
    </AuthLayout>
  )
}
