import { useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { App, Button, Card, Form, Input, InputNumber, Select, Space, Typography } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'

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
    await saveMutation.mutateAsync(values)
  }

  return (
    <div className="page-shell">
      <div className="page-toolbar">
        <Typography.Text className="dashboard-kicker">Patients</Typography.Text>
        <Typography.Title level={2} className="panel-title">
          {isEdit ? '编辑患者' : '新建患者'}
        </Typography.Title>
        <Typography.Paragraph className="panel-subtitle">
          表单提交后直接写入后端数据库，不走 Mock。
        </Typography.Paragraph>
      </div>

      <Card className="panel-card">
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
          <Form.Item label="Server酱 Key" name="server_chan_key">
            <Input placeholder="可选，用于单患者消息推送" />
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
              >
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
