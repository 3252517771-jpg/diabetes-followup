export const patientStatusOptions = [
  { label: '已入组', value: 'enrolled' },
  { label: '随访中', value: 'following' },
  { label: '已结束', value: 'ended' },
  { label: '失访', value: 'lost' },
  { label: '已转科', value: 'transferred' },
]

export const diagnosisTypeOptions = [
  { label: '1型糖尿病', value: 'Type1' },
  { label: '2型糖尿病', value: 'Type2' },
  { label: '妊娠期糖尿病', value: 'Gestational' },
  { label: '其他', value: 'Other' },
]

export const severityOptions = [
  { label: '轻度', value: 'Mild' },
  { label: '中度', value: 'Moderate' },
  { label: '重度', value: 'Severe' },
]

export const genderOptions = [
  { label: '未知', value: 0 },
  { label: '男', value: 1 },
  { label: '女', value: 2 },
]

export function getPatientStatusLabel(status: string) {
  return patientStatusOptions.find((item) => item.value === status)?.label ?? status
}

export function getDiagnosisTypeLabel(value: string | null) {
  if (!value) {
    return '未填写'
  }
  return diagnosisTypeOptions.find((item) => item.value === value)?.label ?? value
}

export function getSeverityLabel(value: string | null) {
  if (!value) {
    return '未填写'
  }
  return severityOptions.find((item) => item.value === value)?.label ?? value
}

export function getGenderLabel(value: number | null) {
  if (value === null || value === undefined) {
    return '未知'
  }
  return genderOptions.find((item) => item.value === value)?.label ?? '未知'
}
