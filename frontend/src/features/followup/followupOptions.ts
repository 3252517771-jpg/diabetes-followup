export const applicableTypeOptions = [
  { label: '全部类型', value: 'all' },
  { label: '1型糖尿病', value: 'Type1' },
  { label: '2型糖尿病', value: 'Type2' },
  { label: '妊娠糖尿病', value: 'GDM' },
]

export const taskTypeOptions = [
  { label: '血糖记录', value: 'blood_glucose' },
  { label: '饮食记录', value: 'diet_record' },
  { label: '电话随访', value: 'phone_visit' },
  { label: '门诊复诊', value: 'hospital_visit' },
  { label: '自定义任务', value: 'custom' },
]

export const executorOptions = [
  { label: '患者', value: 'patient' },
  { label: '医护', value: 'staff' },
  { label: '护士', value: 'nurse' },
  { label: '营养师', value: 'nutritionist' },
]

export const planStatusOptions = [
  { label: '进行中', value: 'active' },
  { label: '已暂停', value: 'paused' },
  { label: '已完成', value: 'completed' },
  { label: '已中止', value: 'cancelled' },
]

export function getPlanStatusColor(status: string) {
  if (status === 'active') {
    return 'blue'
  }
  if (status === 'completed') {
    return 'green'
  }
  if (status === 'paused') {
    return 'gold'
  }
  return 'default'
}

export function getPlanStatusLabel(status: string) {
  return planStatusOptions.find((option) => option.value === status)?.label ?? status
}

export function getTaskTypeLabel(taskType: string) {
  return taskTypeOptions.find((option) => option.value === taskType)?.label ?? taskType
}
