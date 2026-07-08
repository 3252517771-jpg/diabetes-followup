import { useMutation, useQuery } from '@tanstack/react-query'
import {
  App,
  Avatar,
  Button,
  Card,
  Descriptions,
  Empty,
  Space,
  Tag,
  Typography,
} from 'antd'
import { LinkOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'

import { PageIntro } from '../components/PageIntro'
import { QueryStateAlert } from '../components/QueryStateAlert'
import { ScrollStack, ScrollStackItem } from '../components/reactbits/ScrollStack'
import { PatientDietPanel } from '../features/diet/PatientDietPanel'
import { FollowupPlanPanel } from '../features/followup/FollowupPlanPanel'
import { PatientGlucoseRecordsSection } from '../features/glucose/PatientGlucoseRecordsSection'
import { PatientGlucoseSummarySection } from '../features/glucose/PatientGlucoseSummarySection'
import { PatientGlucoseTrendSection } from '../features/glucose/PatientGlucoseTrendSection'
import { usePatientGlucoseData } from '../features/glucose/usePatientGlucoseData'
import { PatientStatusTag } from '../features/patients/PatientStatusTag'
import {
  getDiagnosisTypeLabel,
  getGenderLabel,
  getSeverityLabel,
} from '../features/patients/patientOptions'
import { fetchPatientDetail, fetchPatientH5Access } from '../services/patientService'

function getPatientAvatarText(name: string) {
  const compactName = name.trim()
  if (!compactName) {
    return '患者'
  }

  if (/[\u4e00-\u9fa5]/.test(compactName)) {
    return compactName.slice(0, Math.min(2, compactName.length))
  }

  const segments = compactName.split(/\s+/).filter(Boolean)
  if (segments.length === 1) {
    return segments[0].slice(0, 2).toUpperCase()
  }

  return `${segments[0][0] ?? ''}${segments[1][0] ?? ''}`.toUpperCase()
}

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

  const glucoseTrendData = usePatientGlucoseData({
    patientId,
    days: 14,
    statsDays: 30,
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
  const patientAvatar = getPatientAvatarText(patient.name)

  return (
    <div className="page-shell page-shell--patient-detail">
      <PageIntro
        kicker="Patients"
        title={patient.name}
        description="患者档案、血糖、随访与饮食推荐均来自真实 FastAPI 接口。"
      />

      <div className="patient-detail-layout">
        <Card className="panel-card patient-hero-card">
          <div className="patient-hero-card__top">
            <Avatar
              className="patient-hero-card__avatar"
              size={88}
              icon={!patientAvatar ? <UserOutlined /> : undefined}
            >
              {patientAvatar}
            </Avatar>
            <div className="patient-hero-card__identity">
              <Typography.Text className="dashboard-kicker">Patient Profile</Typography.Text>
              <Typography.Title level={2} className="patient-hero-card__name">
                {patient.name}
              </Typography.Title>
              <Typography.Paragraph className="patient-hero-card__meta">
                {getGenderLabel(patient.gender)} / {patient.age ?? '--'} 岁
              </Typography.Paragraph>
            </div>
          </div>

          <div className="patient-hero-card__status">
            <PatientStatusTag status={patient.status} />
            <Tag className="patient-soft-tag">{getDiagnosisTypeLabel(patient.diagnosis_type)}</Tag>
            <Tag className="patient-soft-tag">{getSeverityLabel(patient.severity)}</Tag>
          </div>

          <div className="patient-hero-card__tags">
            {patient.tags.length ? (
              patient.tags.map((tag) => (
                <Tag key={tag.id} color={tag.color ?? 'default'}>
                  {tag.name}
                </Tag>
              ))
            ) : (
              <Typography.Text type="secondary">暂无标签</Typography.Text>
            )}
          </div>

          <div className="patient-hero-card__summary">
            <div className="patient-hero-card__summary-item">
              <span className="patient-hero-card__summary-label">负责医生</span>
              <strong className="patient-hero-card__summary-value">
                {patient.responsible_doctor?.real_name ?? '--'}
              </strong>
            </div>
            <div className="patient-hero-card__summary-item">
              <span className="patient-hero-card__summary-label">所属科室</span>
              <strong className="patient-hero-card__summary-value">
                {patient.responsible_doctor?.department ?? '--'}
              </strong>
            </div>
            <div className="patient-hero-card__summary-item">
              <span className="patient-hero-card__summary-label">手机号</span>
              <strong className="patient-hero-card__summary-value">{patient.phone ?? '--'}</strong>
            </div>
          </div>

          <Descriptions
            column={1}
            size="small"
            className="patient-detail-descriptions patient-hero-card__descriptions"
          >
            <Descriptions.Item label="自动推送">
              {patient.auto_push_enabled ? '已开启' : '未开启'}
            </Descriptions.Item>
            <Descriptions.Item label="备注">
              {patient.notes?.trim() ? patient.notes : '暂无备注'}
            </Descriptions.Item>
          </Descriptions>

          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Button type="primary" onClick={() => navigate(`/patients/${patient.id}/edit`)}>
              编辑患者
            </Button>
            <Button
              icon={<LinkOutlined />}
              loading={h5AccessMutation.isPending}
              onClick={() => h5AccessMutation.mutate()}
            >
              打开患者 H5 入口
            </Button>
          </Space>
        </Card>

        <div className="patient-detail-sections-viewport">
          <ScrollStack className="patient-detail-sections" stagePadding={160} overlapOffset={84}>
            <ScrollStackItem index={0}>
              <div className="patient-stack-stage patient-stack-stage--followup">
                <FollowupPlanPanel patientId={patient.id} />
              </div>
            </ScrollStackItem>

            <ScrollStackItem index={1}>
              <div className="patient-stack-stage patient-stack-stage--glucose-trend">
                {glucoseTrendData.trendQuery.isError || glucoseTrendData.statsQuery.isError ? (
                  <QueryStateAlert
                    title="血糖趋势加载失败"
                    description={
                      glucoseTrendData.trendQuery.error?.message ??
                      glucoseTrendData.statsQuery.error?.message ??
                      '请稍后重试'
                    }
                    onRetry={() => {
                      void glucoseTrendData.trendQuery.refetch()
                      void glucoseTrendData.statsQuery.refetch()
                    }}
                  />
                ) : (
                  <PatientGlucoseTrendSection
                    loading={
                      glucoseTrendData.trendQuery.isLoading || glucoseTrendData.statsQuery.isLoading
                    }
                    trend={glucoseTrendData.trendQuery.data}
                    stats={glucoseTrendData.statsQuery.data}
                  />
                )}
              </div>
            </ScrollStackItem>

            <ScrollStackItem index={2}>
              <div className="patient-stack-stage patient-stack-stage--glucose-summary">
                {glucoseTrendData.statsQuery.isError ? (
                  <QueryStateAlert
                    title="监测摘要加载失败"
                    description={glucoseTrendData.statsQuery.error.message}
                    onRetry={() => void glucoseTrendData.statsQuery.refetch()}
                  />
                ) : (
                  <PatientGlucoseSummarySection stats={glucoseTrendData.statsQuery.data} />
                )}
              </div>
            </ScrollStackItem>

            <ScrollStackItem index={3}>
              <div className="patient-stack-stage patient-stack-stage--glucose-records">
                <PatientGlucoseRecordsSection patientId={patient.id} />
              </div>
            </ScrollStackItem>

            <ScrollStackItem index={4}>
              <div className="patient-stack-stage patient-stack-stage--diet">
                <PatientDietPanel patientId={patient.id} />
              </div>
            </ScrollStackItem>
          </ScrollStack>
        </div>
      </div>
    </div>
  )
}
