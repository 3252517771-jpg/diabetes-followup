import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Card, Empty, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'

import { EmptyMotion } from '../components/reactbits/EmptyMotion'
import { useAuth } from '../hooks/useAuth'
import {
  createSystemUser,
  fetchSystemUsers,
  updateSystemUser,
} from '../services/systemService'
import type {
  SystemUser,
  SystemUserCreatePayload,
  SystemUserUpdatePayload,
} from '../types/system'
import { SystemUserDrawer } from '../features/system/SystemUserDrawer'

const roleLabels: Record<string, string> = {
  admin: '管理员',
  director: '科主任',
  doctor: '医生',
  nurse: '护士',
  nutritionist: '营养师',
}

export function SystemUsersPage() {
  const { message } = App.useApp()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [roleFilter, setRoleFilter] = useState<string>()
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null)

  const isAdmin = user?.roles.includes('admin') ?? false

  const usersQuery = useQuery({
    queryKey: ['system-users', roleFilter, departmentFilter],
    enabled: isAdmin,
    queryFn: async () => {
      const response = await fetchSystemUsers({
        page: 1,
        size: 100,
        role: roleFilter,
        department: departmentFilter || undefined,
      })
      if (!response.data) {
        throw new Error(response.message || '用户列表加载失败')
      }
      return response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: createSystemUser,
    onSuccess: async () => {
      message.success('用户已创建')
      setDrawerOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['system-users'] })
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '创建用户失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: SystemUserUpdatePayload }) =>
      updateSystemUser(userId, payload),
    onSuccess: async () => {
      message.success('用户已更新')
      setDrawerOpen(false)
      setEditingUser(null)
      await queryClient.invalidateQueries({ queryKey: ['system-users'] })
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '更新用户失败')
    },
  })

  const columns = useMemo<ColumnsType<SystemUser>>(
    () => [
      { title: '姓名', dataIndex: 'real_name', key: 'real_name' },
      { title: '账号', dataIndex: 'username', key: 'username' },
      {
        title: '角色',
        dataIndex: 'role_code',
        key: 'role_code',
        render: (value: string) => <Tag color="blue">{roleLabels[value] ?? value}</Tag>,
      },
      { title: '科室', dataIndex: 'department', key: 'department', render: (value) => value || '--' },
      { title: '手机号', dataIndex: 'phone', key: 'phone', render: (value) => value || '--' },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (value: number) => <Tag color={value === 1 ? 'green' : 'default'}>{value === 1 ? '启用' : '停用'}</Tag>,
      },
      {
        title: '操作',
        key: 'action',
        render: (_, record) => (
          <Button
            type="link"
            onClick={() => {
              setEditingUser(record)
              setDrawerOpen(true)
            }}
          >
            编辑
          </Button>
        ),
      },
    ],
    [],
  )

  if (!isAdmin) {
    return (
      <Card className="panel-card">
        <Empty description="当前账号没有系统管理权限" />
      </Card>
    )
  }

  return (
    <div className="page-shell">
      <div className="page-toolbar">
        <Typography.Text className="dashboard-kicker">System</Typography.Text>
        <Typography.Title level={2} className="panel-title">
          用户管理
        </Typography.Title>
        <Typography.Paragraph className="panel-subtitle">
          管理员可在这里维护系统账号、角色和启停状态。
        </Typography.Paragraph>
      </div>

      <Card className="panel-card">
        <div className="system-filter-row">
          <Input
            placeholder="按科室筛选"
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
          />
          <Select
            allowClear
            placeholder="按角色筛选"
            value={roleFilter}
            options={Object.entries(roleLabels).map(([value, label]) => ({ value, label }))}
            onChange={setRoleFilter}
          />
          <Space>
            <Button
              onClick={() => {
                setRoleFilter(undefined)
                setDepartmentFilter('')
              }}
            >
              重置
            </Button>
            <Button
              type="primary"
              onClick={() => {
                setEditingUser(null)
                setDrawerOpen(true)
              }}
            >
              新建用户
            </Button>
          </Space>
        </div>

        <Table
          rowKey="id"
          loading={usersQuery.isLoading}
          columns={columns}
          dataSource={usersQuery.data?.items ?? []}
          pagination={false}
          locale={{ emptyText: <EmptyMotion description="暂无系统用户数据" /> }}
        />
      </Card>

      <SystemUserDrawer
        open={drawerOpen}
        user={editingUser}
        loading={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setDrawerOpen(false)
          setEditingUser(null)
        }}
        onSubmit={async (values) => {
          if (editingUser) {
            await updateMutation.mutateAsync({
              userId: editingUser.id,
              payload: values as SystemUserUpdatePayload,
            })
            return
          }
          await createMutation.mutateAsync(values as SystemUserCreatePayload)
        }}
      />
    </div>
  )
}
