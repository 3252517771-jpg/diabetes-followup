import { request } from './request'

export interface H5PatientInfo {
  id: number
  name: string
  gender: number | null
  age: number | null
  diagnosis_type: string | null
  severity: string | null
}

export interface H5TaskItem {
  key: string
  title: string
  description: string
}

export interface H5NotificationItem {
  id: number
  status: string
  channel: string
  content: string
  sent_at: string
  fail_reason: string | null
}

export interface H5RecentGlucoseRecord {
  id: number
  patient_id: number
  value: number | string
  measure_time: string
  category: string
  is_abnormal: boolean
  abnormal_reason: string | null
  source: string
  notes: string | null
  created_at: string
  editable: boolean
}

export interface H5GlucosePayload {
  value: number
  measure_time: string
  category: string
  notes?: string
}

export interface H5SubmittedGlucoseRecord {
  id: number
  value: number | string
  measure_time: string
  source: string
}

export async function fetchPatientInfo(token: string) {
  return request<H5PatientInfo>(`/h5/api/patient/info?token=${encodeURIComponent(token)}`)
}

export async function fetchPatientTasks(token: string) {
  return request<H5TaskItem[]>(`/h5/api/patient/tasks?token=${encodeURIComponent(token)}`)
}

export async function fetchPatientNotifications(token: string) {
  return request<H5NotificationItem[]>(`/h5/api/patient/notifications?token=${encodeURIComponent(token)}`)
}

export async function submitPatientGlucose(token: string, payload: H5GlucosePayload) {
  return request<H5SubmittedGlucoseRecord>('/h5/api/patient/glucose', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-H5-Token': token,
    },
    body: JSON.stringify(payload),
  })
}

export async function fetchRecentPatientGlucose(token: string, limit = 5) {
  return request<H5RecentGlucoseRecord[]>(
    `/h5/api/patient/glucose/recent?token=${encodeURIComponent(token)}&limit=${limit}`,
  )
}

export async function updatePatientGlucose(
  token: string,
  recordId: number,
  payload: H5GlucosePayload,
) {
  return request<H5SubmittedGlucoseRecord>(`/h5/api/patient/glucose/${recordId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-H5-Token': token,
    },
    body: JSON.stringify(payload),
  })
}
