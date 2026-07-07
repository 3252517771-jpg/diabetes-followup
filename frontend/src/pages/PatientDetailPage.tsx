import { useQuery } from '@tanstack/react-query'
import { Button, Card, Col, Descriptions, Empty, Row, Space, Statistic, Tabs, Tag, Typography } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'

import { PatientGlucosePanel } from '../features/glucose/PatientGlucosePanel'
import { PatientStatusTag } from '../features/patients/PatientStatusTag'
import {
  getDiagnosisTypeLabel,
  getGenderLabel,
  getSeverityLabel,
} from '../features/patients/patientOptions'
import { fetchPatientDetail } from '../services/patientService'

export function PatientDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const patientId = Number(id)

  const detailQuery = useQuery({
    queryKey: ['patient-detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await fetchPatientDetail(patientId)
      if (!response.data) {
        throw new Error(response.message || '患者详情加载失败')
      }
      return response.data
    },
  })

  if (detailQuery.isLoading) {
    return <Card loading className="panel-card" />
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
          患者档案、标签、血糖监测和后续随访模块均从真实接口读取。
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
                  {getGenderLabel(patient.gender)} · {patient.age ?? '--'} 岁
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

              <Button type="primary" onClick={() => navigate(`/patients/${patient.id}/edit`)}>
                编辑患者
              </Button>
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
                        <Descriptions.Item label="诊断类型">
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
                    children: <Empty description="M4 将接入随访计划执行信息" />,
                  },
                  {
                    key: 'diet',
                    label: '饮食',
                    children: <Empty description="M5 将接入饮食推荐与记录" />,
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
