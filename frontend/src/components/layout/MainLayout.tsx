import { Avatar, Button, Layout, Menu, Space, Typography } from 'antd'
import {
  DashboardOutlined,
  LineChartOutlined,
  LogoutOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { PropsWithChildren } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { ROUTE_PATHS } from '../../config/routes'
import { useAuth } from '../../hooks/useAuth'

const { Header, Sider, Content } = Layout

export function MainLayout({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  function handleLogout() {
    logout()
    navigate(ROUTE_PATHS.login)
  }

  const selectedKey = location.pathname.startsWith('/patients')
    ? 'patients'
    : location.pathname.startsWith('/glucose')
      ? 'glucose'
      : 'dashboard'

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
          selectedKeys={[selectedKey]}
          onClick={({ key }) => {
            if (key === 'dashboard') {
              navigate(ROUTE_PATHS.dashboard)
            }
            if (key === 'patients') {
              navigate(ROUTE_PATHS.patients)
            }
            if (key === 'glucose') {
              navigate(ROUTE_PATHS.glucoseOverview)
            }
          }}
          items={[
            {
              key: 'dashboard',
              icon: <DashboardOutlined />,
              label: '工作台',
            },
            {
              key: 'patients',
              icon: <TeamOutlined />,
              label: '患者管理',
            },
            {
              key: 'glucose',
              icon: <LineChartOutlined />,
              label: '血糖总览',
            },
          ]}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Typography.Title level={5} className="page-title">
            糖尿病随访系统
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
