import { Tag } from 'antd'

import { getPatientStatusLabel } from './patientOptions'

const statusColorMap: Record<string, string> = {
  enrolled: 'default',
  following: 'processing',
  ended: 'success',
  lost: 'error',
  transferred: 'warning',
}

interface PatientStatusTagProps {
  status: string
}

export function PatientStatusTag({ status }: PatientStatusTagProps) {
  return <Tag color={statusColorMap[status] ?? 'default'}>{getPatientStatusLabel(status)}</Tag>
}
