import { useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Typography,
} from 'antd'
import { useNavigate, useParams } from 'react-router-dom'

import { QueryStateAlert } from '../components/QueryStateAlert'
import { ROUTE_PATHS } from '../config/routes'
import {
  diagnosisTypeOptions,
  genderOptions,
  patientStatusOptions,
  severityOptions,
} from '../features/patients/patientOptions'
import {
  createPatient,
  fetchPatientDetail,
  fetchTags,
  updatePatient,
} from '../services/patientService'
import type { PatientFormValues } from '../types/patient'

const initialValues: PatientFormValues = {
  name: '',
  gender: null,
  age: null,
  phone: null,
  diagnosis_type: null,
  severity: null,
  status: 'enrolled',
  auto_push_enabled: false,
  notes: null,
  server_chan_key: null,
  tag_ids: [],
}

export function PatientFormPage() {
  const [form] = Form.useForm<PatientFormValues>()
  const navigate = useNavigate()
  const { id } = useParams()
  const { message } = App.useApp()
  const isEdit = Boolean(id)

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

  const detailQuery = useQuery({
    queryKey: ['patient-detail', id],
    enabled: isEdit,
    queryFn: async () => {
      const response = await fetchPatientDetail(Number(id))
      if (!response.data) {
        throw new Error(response.message || '加载患者详情失败')
      }
      return response.data
    },
  })

  useEffect(() => {
    if (!detailQuery.data) {
      return
    }
    form.setFieldsValue({
      name: detailQuery.data.name,
      gender: detailQuery.data.gender,
      age: detailQuery.data.age,
      phone: detailQuery.data.phone,
      diagnosis_type: detailQuery.data.diagnosis_type,
      severity: detailQuery.data.severity,
      status: detailQuery.data.status,
      auto_push_enabled: detailQuery.data.auto_push_enabled,
      notes: detailQuery.data.notes,
      server_chan_key: detailQuery.data.server_chan_key,
      tag_ids: detailQuery.data.tags.map((tag) => tag.id),
    })
  }, [detailQuery.data, form])

  const saveMutation = useMutation({
    mutationFn: async (values: PatientFormValues) => {
      if (isEdit) {
        return updatePatient(Number(id), values)
      }
      return createPatient(values)
    },
    onSuccess: (response) => {
      const patientId = response.data?.id
      message.success(isEdit ? '患者信息已更新' : '患者创建成功')
      if (patientId) {
        navigate(`/patients/${patientId}`)
      } else {
        navigate(ROUTE_PATHS.patients)
      }
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '保存失败')
    },
  })

  async function handleFinish(values: PatientFormValues) {
    const normalizedValues: PatientFormValues = {
      ...values,
      server_chan_key: values.server_chan_key?.trim() || null,
    }
    await saveMutation.mutateAsync(normalizedValues)
  }

  return (
    <div className="page-shell">
      <div className="page-toolbar">
        <Typography.Text className="dashboard-kicker">Patients</Typography.Text>
        <Typography.Title level={2} className="panel-title">
          {isEdit ? '编辑患者' : '新建患者'}
        </Typography.Title>
        <Typography.Paragraph className="panel-subtitle">
          表单提交后直接写入后端数据库，不经过 Mock。
        </Typography.Paragraph>
      </div>

      <Card className="panel-card">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {tagQuery.isError || detailQuery.isError ? (
            <QueryStateAlert
              title={isEdit ? '患者表单初始化失败' : '标签加载失败'}
              description={detailQuery.error?.message ?? tagQuery.error?.message ?? '请稍后重试'}
              onRetry={() => {
                void tagQuery.refetch()
                if (isEdit) {
                  void detailQuery.refetch()
                }
              }}
            />
          ) : null}

          <Alert
            type="info"
            showIcon
            message="关于提醒配置"
            description="开启自动推送提醒后，系统会为该患者自动发送每日血糖录入提醒和随访任务提醒；若未填写患者专属 SendKey，将回退使用系统默认 SendKey。"
          />

          <Form
            form={form}
            layout="vertical"
            initialValues={initialValues}
            onFinish={handleFinish}
            className="patient-form-grid"
          >
            <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
              <Input placeholder="请输入患者姓名" />
            </Form.Item>
            <Form.Item label="性别" name="gender">
              <Select allowClear placeholder="请选择性别" options={genderOptions} />
            </Form.Item>
            <Form.Item label="年龄" name="age">
              <InputNumber min={0} max={120} style={{ width: '100%' }} placeholder="请输入年龄" />
            </Form.Item>
            <Form.Item label="手机号" name="phone">
              <Input placeholder="请输入手机号" />
            </Form.Item>
            <Form.Item label="糖尿病类型" name="diagnosis_type">
              <Select allowClear placeholder="请选择类型" options={diagnosisTypeOptions} />
            </Form.Item>
            <Form.Item label="严重程度" name="severity">
              <Select allowClear placeholder="请选择严重程度" options={severityOptions} />
            </Form.Item>
            <Form.Item label="患者状态" name="status" rules={[{ required: true, message: '请选择患者状态' }]}>
              <Select options={patientStatusOptions} />
            </Form.Item>
            <Form.Item
              label="患者专属 SendKey"
              name="server_chan_key"
              tooltip="用于把患者自动提醒和审核通过的饮食推荐推送到该患者绑定的微信"
            >
              <Input placeholder="可选，例如 SCTxxxx；留空则使用系统默认 SendKey" />
            </Form.Item>
            <Form.Item
              label="自动推送提醒"
              name="auto_push_enabled"
              valuePropName="checked"
            >
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
            <Form.Item className="patient-form-span-2">
              <Typography.Text type="secondary">
                开启后，系统将自动发送每日血糖录入提醒和随访任务提醒。
              </Typography.Text>
            </Form.Item>
            <Form.Item label="患者标签" name="tag_ids" className="patient-form-span-2">
              <Select
                mode="multiple"
                placeholder="选择患者标签"
                loading={tagQuery.isLoading}
                options={(tagQuery.data ?? []).map((tag) => ({
                  label: tag.name,
                  value: tag.id,
                }))}
              />
            </Form.Item>
            <Form.Item label="备注" name="notes" className="patient-form-span-2">
              <Input.TextArea rows={5} placeholder="可填写风险提醒、沟通偏好等补充信息" />
            </Form.Item>
            <Form.Item className="patient-form-actions patient-form-span-2">
              <Space>
                <Button onClick={() => navigate(-1)}>取消</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                loading={saveMutation.isPending || detailQuery.isLoading}
                disabled={tagQuery.isError || detailQuery.isError}
              >
                保存
              </Button>
              </Space>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  )
}
