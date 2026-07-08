import { useMutation, useQuery } from '@tanstack/react-query'
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Space,
  Statistic,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import { useNavigate, useParams } from 'react-router-dom'

import { QueryStateAlert } from '../components/QueryStateAlert'
import { PatientDietPanel } from '../features/diet/PatientDietPanel'
import { FollowupPlanPanel } from '../features/followup/FollowupPlanPanel'
import { PatientGlucosePanel } from '../features/glucose/PatientGlucosePanel'
import { PatientStatusTag } from '../features/patients/PatientStatusTag'
import {
  getDiagnosisTypeLabel,
  getGenderLabel,
  getSeverityLabel,
} from '../features/patients/patientOptions'
import { fetchPatientDetail, fetchPatientH5Access } from '../services/patientService'

export function PatientDetailPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { id } = useParams()
  const patientId = Number(id)

  const detailQuery = useQuery({
    queryKey: ['patient-detail', id],
    enabled: Number.isFinite(patientId),
    queryFn: async () => {
      const response = await fetchPatientDetail(patientId)
      if (!response.data) {
        throw new Error(response.message || '患者详情加载失败')
      }
      return response.data
    },
  })

  const h5AccessMutation = useMutation({
    mutationFn: () => fetchPatientH5Access(patientId),
    onSuccess: async (response) => {
      if (!response.data) {
        message.error(response.message || '获取 H5 入口失败')
        return
      }
      await navigator.clipboard.writeText(response.data.access_url)
      window.open(response.data.access_url, '_blank', 'noopener,noreferrer')
      message.success('已复制并打开患者 H5 入口')
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '获取 H5 入口失败')
    },
  })

  if (detailQuery.isLoading) {
    return <Card loading className="panel-card" />
  }

  if (detailQuery.isError) {
    return (
      <Card className="panel-card">
        <QueryStateAlert
          title="患者详情加载失败"
          description={detailQuery.error.message}
          onRetry={() => void detailQuery.refetch()}
        />
      </Card>
    )
  }

  if (!detailQuery.data) {
    return (
      <Card className="panel-card">
        <Empty description="未找到患者信息" />
      </Card>
    )
  }

  const patient = detailQuery.data

  return (
    <div className="page-shell">
      <div className="page-toolbar">
        <Typography.Text className="dashboard-kicker">Patients</Typography.Text>
        <Typography.Title level={2} className="panel-title">
          {patient.name}
        </Typography.Title>
        <Typography.Paragraph className="panel-subtitle">
          患者档案、血糖、随访与饮食推荐均来自真实 FastAPI 接口。
        </Typography.Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={7}>
          <Card className="panel-card patient-profile-card">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div>
                <Typography.Title level={3} className="patient-name">
                  {patient.name}
                </Typography.Title>
                <Typography.Text type="secondary">
                  {getGenderLabel(patient.gender)} / {patient.age ?? '--'} 岁
                </Typography.Text>
              </div>

              <Space wrap>
                <PatientStatusTag status={patient.status} />
                {patient.tags.map((tag) => (
                  <Tag key={tag.id} color={tag.color ?? 'default'}>
                    {tag.name}
                  </Tag>
                ))}
              </Space>

              <Descriptions column={1} size="small" className="patient-detail-descriptions">
                <Descriptions.Item label="糖尿病类型">
                  {getDiagnosisTypeLabel(patient.diagnosis_type)}
                </Descriptions.Item>
                <Descriptions.Item label="严重程度">
                  {getSeverityLabel(patient.severity)}
                </Descriptions.Item>
                <Descriptions.Item label="手机号">{patient.phone ?? '--'}</Descriptions.Item>
                <Descriptions.Item label="负责医生">
                  {patient.responsible_doctor?.real_name ?? '--'}
                </Descriptions.Item>
                <Descriptions.Item label="科室">
                  {patient.responsible_doctor?.department ?? '--'}
                </Descriptions.Item>
                <Descriptions.Item label="备注">{patient.notes ?? '暂无备注'}</Descriptions.Item>
              </Descriptions>

              <Space direction="vertical" style={{ width: '100%' }}>
                <Button type="primary" onClick={() => navigate(`/patients/${patient.id}/edit`)}>
                  编辑患者
                </Button>
                <Button loading={h5AccessMutation.isPending} onClick={() => h5AccessMutation.mutate()}>
                  打开患者 H5 入口
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>

        <Col span={17}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Card className="panel-card">
                  <Statistic title="当前状态" value={patient.status} />
                </Card>
              </Col>
              <Col span={8}>
                <Card className="panel-card">
                  <Statistic title="标签数量" value={patient.tags.length} />
                </Card>
              </Col>
              <Col span={8}>
                <Card className="panel-card">
                  <Statistic title="最近更新" value={patient.updated_at.slice(0, 10)} />
                </Card>
              </Col>
            </Row>

            <Card className="panel-card">
              <Tabs
                items={[
                  {
                    key: 'archive',
                    label: '档案',
                    children: (
                      <Descriptions column={2} bordered size="small">
                        <Descriptions.Item label="姓名">{patient.name}</Descriptions.Item>
                        <Descriptions.Item label="性别">
                          {getGenderLabel(patient.gender)}
                        </Descriptions.Item>
                        <Descriptions.Item label="年龄">{patient.age ?? '--'}</Descriptions.Item>
                        <Descriptions.Item label="手机号">{patient.phone ?? '--'}</Descriptions.Item>
                        <Descriptions.Item label="糖尿病类型">
                          {getDiagnosisTypeLabel(patient.diagnosis_type)}
                        </Descriptions.Item>
                        <Descriptions.Item label="严重程度">
                          {getSeverityLabel(patient.severity)}
                        </Descriptions.Item>
                      </Descriptions>
                    ),
                  },
                  {
                    key: 'glucose',
                    label: '血糖',
                    children: <PatientGlucosePanel patientId={patient.id} />,
                  },
                  {
                    key: 'followup',
                    label: '随访计划',
                    children: <FollowupPlanPanel patientId={patient.id} />,
                  },
                  {
                    key: 'diet',
                    label: '饮食推荐',
                    children: <PatientDietPanel patientId={patient.id} />,
                  },
                ]}
              />
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  )
}
