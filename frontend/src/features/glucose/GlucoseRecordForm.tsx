import { App, DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd'
import dayjs from 'dayjs'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createPatientGlucoseRecord } from '../../services/glucoseService'
import type { BloodGlucoseRecordFormValues, GlucoseCategory } from '../../types/glucose'
import { GLUCOSE_CATEGORY_OPTIONS } from './glucoseOptions'

interface GlucoseRecordFormProps {
  patientId: number
  open: boolean
  onClose: () => void
}

interface GlucoseRecordFields {
  value: number
  measure_time: dayjs.Dayjs
  category: GlucoseCategory
  notes?: string
}

export function GlucoseRecordForm({ patientId, open, onClose }: GlucoseRecordFormProps) {
  const [form] = Form.useForm<GlucoseRecordFields>()
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  const mutation = useMutation({
    mutationFn: async (values: GlucoseRecordFields) => {
      const payload: BloodGlucoseRecordFormValues = {
        value: values.value,
        measure_time: values.measure_time.toISOString(),
        category: values.category,
        notes: values.notes?.trim() || null,
      }
      const response = await createPatientGlucoseRecord(patientId, payload)
      if (!response.data) {
        throw new Error(response.message || '血糖记录保存失败')
      }
      return response.data
    },
    onSuccess: async () => {
      message.success('血糖记录已保存')
      form.resetFields()
      onClose()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['patient-glucose-records', patientId] }),
        queryClient.invalidateQueries({ queryKey: ['patient-glucose-trend', patientId] }),
        queryClient.invalidateQueries({ queryKey: ['patient-glucose-stats', patientId] }),
        queryClient.invalidateQueries({ queryKey: ['glucose-overview'] }),
      ])
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '血糖记录保存失败')
    },
  })

  return (
    <Modal
      title="录入血糖"
      open={open}
      okText="保存"
      cancelText="取消"
      confirmLoading={mutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ category: 'fasting', measure_time: dayjs() }}
        onFinish={(values) => mutation.mutate(values)}
      >
        <Form.Item
          label="血糖值"
          name="value"
          rules={[{ required: true, message: '请输入血糖值' }]}
        >
          <InputNumber min={0.1} max={50} precision={2} addonAfter="mmol/L" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label="测量时间"
          name="measure_time"
          rules={[{ required: true, message: '请选择测量时间' }]}
        >
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label="分类"
          name="category"
          rules={[{ required: true, message: '请选择血糖分类' }]}
        >
          <Select options={GLUCOSE_CATEGORY_OPTIONS} />
        </Form.Item>
        <Form.Item label="备注" name="notes">
          <Input.TextArea rows={3} maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
