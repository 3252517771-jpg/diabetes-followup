import { Layout, Menu, Typography, Button, Avatar, Space } from 'antd'
import { DashboardOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'
import type { PropsWithChildren } from 'react'
import { useNavigate } from 'react-router-dom'

import { ROUTE_PATHS } from '../../config/routes'
import { useAuth } from '../../hooks/useAuth'

const { Header, Sider, Content } = Layout

export function MainLayout({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  function handleLogout() {
    logout()
    navigate(ROUTE_PATHS.login)
  }

  return (
    <Layout className="app-layout">
      <Sider width={228} className="app-sider" theme="light">
        <div className="brand-block">
          <Typography.Text className="brand-kicker">Diabetes Followup</Typography.Text>
          <Typography.Title level={4} className="brand-title">
            糖尿病随访系统
          </Typography.Title>
        </div>
        <Menu
          mode="inline"
          defaultSelectedKeys={['dashboard']}
          items={[
            {
              key: 'dashboard',
              icon: <DashboardOutlined />,
              label: '工作台',
            },
          ]}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Typography.Title level={5} className="page-title">
            项目骨架 + 认证系统
          </Typography.Title>
          <Space size={12}>
            <div className="user-pill">
              <Avatar size={32} icon={<UserOutlined />} />
              <div>
                <div className="user-pill__name">{user?.real_name ?? '未登录'}</div>
                <div className="user-pill__meta">{user?.department ?? '内分泌科'}</div>
              </div>
            </div>
            <Button icon={<LogoutOutlined />} onClick={handleLogout}>
              退出
            </Button>
          </Space>
        </Header>
        <Content className="app-content">{children}</Content>
      </Layout>
    </Layout>
  )
}
