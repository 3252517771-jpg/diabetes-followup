import { Avatar, Button, Layout, Space, Typography } from 'antd'
import {
  DashboardOutlined,
  LineChartOutlined,
  LogoutOutlined,
  MessageOutlined,
  NotificationOutlined,
  ScheduleOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { PropsWithChildren } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { ROUTE_PATHS } from '../../config/routes'
import { useAuth } from '../../hooks/useAuth'
import { StaggeredMenu } from '../reactbits/StaggeredMenu'
import { TextType } from '../reactbits/TextType'

const { Header, Content } = Layout

const navigationMeta = {
  dashboard: { kicker: 'Dashboard', title: '科室工作台' },
  patients: { kicker: 'Patients', title: '患者管理' },
  glucose: { kicker: 'Glucose', title: '血糖总览' },
  followup: { kicker: 'Followup', title: '随访计划' },
  diet: { kicker: 'Diet', title: '饮食推荐' },
  notifications: { kicker: 'Messages', title: '消息中心' },
  'system-users': { kicker: 'System', title: '用户管理' },
  'system-config': { kicker: 'System', title: '系统配置' },
} as const

export function MainLayout({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const isAdmin = user?.roles.includes('admin') ?? false

  function handleLogout() {
    logout()
    navigate(ROUTE_PATHS.login)
  }

  const selectedKey = location.pathname.startsWith('/patients')
    ? 'patients'
    : location.pathname.startsWith('/glucose')
      ? 'glucose'
      : location.pathname.startsWith('/followup')
        ? 'followup'
        : location.pathname.startsWith('/diet')
          ? 'diet'
          : location.pathname.startsWith('/notifications')
            ? 'notifications'
            : location.pathname.startsWith('/system/users')
              ? 'system-users'
              : location.pathname.startsWith('/system/config')
                ? 'system-config'
                : 'dashboard'

  const items = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: '工作台' },
    { key: 'patients', icon: <TeamOutlined />, label: '患者管理' },
    { key: 'glucose', icon: <LineChartOutlined />, label: '血糖总览' },
    { key: 'followup', icon: <ScheduleOutlined />, label: '随访计划' },
    { key: 'diet', icon: <NotificationOutlined />, label: '饮食推荐' },
    { key: 'notifications', icon: <MessageOutlined />, label: '消息中心' },
    ...(isAdmin
      ? [
          { key: 'system-users', icon: <UserOutlined />, label: '用户管理' },
          { key: 'system-config', icon: <SettingOutlined />, label: '系统配置' },
        ]
      : []),
  ]

  const currentMeta = navigationMeta[selectedKey]

  function handleNavigate(key: string) {
    if (key === 'dashboard') navigate(ROUTE_PATHS.dashboard)
    if (key === 'patients') navigate(ROUTE_PATHS.patients)
    if (key === 'glucose') navigate(ROUTE_PATHS.glucoseOverview)
    if (key === 'followup') navigate(ROUTE_PATHS.followupTemplates)
    if (key === 'diet') navigate(ROUTE_PATHS.dietManage)
    if (key === 'notifications') navigate(ROUTE_PATHS.notifications)
    if (key === 'system-users') navigate(ROUTE_PATHS.systemUsers)
    if (key === 'system-config') navigate(ROUTE_PATHS.systemConfig)
  }

  return (
    <Layout className="app-layout">
      <Layout>
        <Header className="app-header">
          <div className="app-header__leading">
            <StaggeredMenu
              brandKicker="Diabetes Followup"
              brandTitle="糖尿病随访系统"
              items={items}
              selectedKey={selectedKey}
              onSelect={handleNavigate}
            />
            <div className="app-header__title-group">
              <Typography.Text className="brand-kicker">{currentMeta.kicker}</Typography.Text>
              <Typography.Title level={5} className="page-title app-header__title">
                <TextType text={currentMeta.title} as="span" speed={28} />
              </Typography.Title>
            </div>
          </div>
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
