import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App,
  Button,
  Card,
  Flex,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { TablePaginationConfig } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

import { QueryStateAlert } from '../components/QueryStateAlert'
import { ROUTE_PATHS } from '../config/routes'
import { PatientTagManager } from '../features/patients/PatientTagManager'
import { PatientStatusTag } from '../features/patients/PatientStatusTag'
import {
  diagnosisTypeOptions,
  getDiagnosisTypeLabel,
  getGenderLabel,
  getSeverityLabel,
  patientStatusOptions,
  severityOptions,
} from '../features/patients/patientOptions'
import { deletePatient, fetchPatients, fetchTags } from '../services/patientService'

interface FiltersState {
  search: string
  status?: string
  diagnosis_type?: string
  severity?: string
  tag?: number
}

export function PatientListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [filters, setFilters] = useState<FiltersState>({ search: '' })
  const [tagManagerOpen, setTagManagerOpen] = useState(false)

  const patientQuery = useQuery({
    queryKey: ['patients', page, size, filters],
    queryFn: async () => {
      const response = await fetchPatients({
        page,
        size,
        ...filters,
      })
      if (!response.data) {
        throw new Error(response.message || '加载患者列表失败')
      }
      return response.data
    },
  })

  const tagQuery = useQuery({
    queryKey: ['patient-tags'],
    queryFn: async () => {
      const response = await fetchTags()
      if (!response.data) {
        throw new Error(response.message || '加载标签失败')
      }
      return response.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deletePatient,
    onSuccess: async () => {
      message.success('患者已删除')
      await queryClient.invalidateQueries({ queryKey: ['patients'] })
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '删除失败')
    },
  })

  const columns = useMemo(
    () => [
      {
        title: '姓名',
        dataIndex: 'name',
        key: 'name',
        render: (_: unknown, record: { id: number; name: string }) => (
          <Button type="link" onClick={() => navigate(`/patients/${record.id}`)}>
            {record.name}
          </Button>
        ),
      },
      {
        title: '性别',
        dataIndex: 'gender',
        key: 'gender',
        render: (value: number | null) => getGenderLabel(value),
      },
      {
        title: '年龄',
        dataIndex: 'age',
        key: 'age',
        render: (value: number | null) => value ?? '--',
      },
      {
        title: '糖尿病类型',
        dataIndex: 'diagnosis_type',
        key: 'diagnosis_type',
        render: (value: string | null) => getDiagnosisTypeLabel(value),
      },
      {
        title: '严重程度',
        dataIndex: 'severity',
        key: 'severity',
        render: (value: string | null) => getSeverityLabel(value),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (value: string) => <PatientStatusTag status={value} />,
      },
      {
        title: '标签',
        dataIndex: 'tags',
        key: 'tags',
        render: (tags: Array<{ id: number; name: string; color: string | null }>) =>
          tags.length ? (
            <Space wrap>
              {tags.map((tag) => (
                <Tag key={tag.id} color={tag.color ?? 'default'}>
                  {tag.name}
                </Tag>
              ))}
            </Space>
          ) : (
            '--'
          ),
      },
      {
        title: '负责医生',
        dataIndex: 'responsible_doctor',
        key: 'responsible_doctor',
        render: (doctor: { real_name: string } | null) => doctor?.real_name ?? '--',
      },
      {
        title: '操作',
        key: 'actions',
        render: (_: unknown, record: { id: number }) => (
          <Space>
            <Button type="link" onClick={() => navigate(`/patients/${record.id}/edit`)}>
              编辑
            </Button>
            <Popconfirm
              title="确认删除该患者？"
              okText="删除"
              cancelText="取消"
              onConfirm={() => deleteMutation.mutate(record.id)}
            >
              <Button type="link" danger loading={deleteMutation.isPending}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [deleteMutation, navigate],
  )

  function handleTableChange(pagination: TablePaginationConfig) {
    setPage(pagination.current ?? 1)
    setSize(pagination.pageSize ?? 10)
  }

  return (
    <div className="page-shell">
      <Flex align="center" justify="space-between" className="page-toolbar">
        <div>
          <Typography.Text className="dashboard-kicker">Patients</Typography.Text>
          <Typography.Title level={2} className="panel-title">
            患者管理
          </Typography.Title>
          <Typography.Paragraph className="panel-subtitle">
            支持搜索、筛选、分页以及真实接口删除与跳转。
          </Typography.Paragraph>
        </div>
        <Space>
          <Button onClick={() => setTagManagerOpen(true)}>管理标签</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(ROUTE_PATHS.patientCreate)}>
            新建患者
          </Button>
        </Space>
      </Flex>

      <Card className="panel-card">
        {patientQuery.isError ? (
          <QueryStateAlert
            title="患者列表加载失败"
            description={patientQuery.error.message}
            onRetry={() => void patientQuery.refetch()}
          />
        ) : null}

        <div className="patient-filter-grid">
          <Input.Search
            allowClear
            placeholder="搜索姓名或手机号"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            onSearch={() => setPage(1)}
          />
          <Select
            allowClear
            placeholder="患者状态"
            options={patientStatusOptions}
            value={filters.status}
            onChange={(value) => {
              setPage(1)
              setFilters((prev) => ({ ...prev, status: value }))
            }}
          />
          <Select
            allowClear
            placeholder="糖尿病类型"
            options={diagnosisTypeOptions}
            value={filters.diagnosis_type}
            onChange={(value) => {
              setPage(1)
              setFilters((prev) => ({ ...prev, diagnosis_type: value }))
            }}
          />
          <Select
            allowClear
            placeholder="严重程度"
            options={severityOptions}
            value={filters.severity}
            onChange={(value) => {
              setPage(1)
              setFilters((prev) => ({ ...prev, severity: value }))
            }}
          />
          <Button
            onClick={() => {
              setPage(1)
              setFilters({ search: '' })
            }}
          >
            重置
          </Button>
        </div>

        <div className="quick-tag-row">
          <Typography.Text className="quick-tag-label">标签快速筛选</Typography.Text>
          {tagQuery.isError ? (
            <Typography.Text type="danger">{tagQuery.error.message}</Typography.Text>
          ) : (
            <Space wrap>
            {tagQuery.data?.map((tag) => {
              const active = filters.tag === tag.id
              return (
                <Tag.CheckableTag
                  key={tag.id}
                  checked={active}
                  onChange={() => {
                    setPage(1)
                    setFilters((prev) => ({ ...prev, tag: active ? undefined : tag.id }))
                  }}
                >
                  {tag.name}
                </Tag.CheckableTag>
              )
            })}
            </Space>
          )}
        </div>

        <Table
          rowKey="id"
          loading={patientQuery.isLoading}
          columns={columns}
          dataSource={patientQuery.data?.items ?? []}
          pagination={{
            current: page,
            pageSize: size,
            total: patientQuery.data?.total ?? 0,
            showSizeChanger: true,
          }}
          onChange={handleTableChange}
          locale={{ emptyText: patientQuery.isLoading ? '加载中...' : '暂无患者数据' }}
        />
      </Card>

      <PatientTagManager
        tags={tagQuery.data ?? []}
        open={tagManagerOpen}
        onClose={() => setTagManagerOpen(false)}
      />
    </div>
  )
}
