import { request } from './request'
import type { ApiResponse, PageData } from '../types/common'
import type {
  BloodGlucoseRecord,
  BloodGlucoseRecordFormValues,
  GlucoseOverview,
  GlucoseRecordListParams,
  GlucoseStats,
  GlucoseTrend,
} from '../types/glucose'

export async function fetchGlucoseOverview(days = 7) {
  const response = await request.get<ApiResponse<GlucoseOverview>>('/glucose/overview', {
    params: { days },
  })
  return response.data
}

export async function fetchPatientGlucoseRecords(
  patientId: number,
  params: GlucoseRecordListParams,
) {
  const response = await request.get<ApiResponse<PageData<BloodGlucoseRecord>>>(
    `/patients/${patientId}/blood-glucose`,
    { params },
  )
  return response.data
}

export async function createPatientGlucoseRecord(
  patientId: number,
  payload: BloodGlucoseRecordFormValues,
) {
  const response = await request.post<ApiResponse<BloodGlucoseRecord>>(
    `/patients/${patientId}/blood-glucose`,
    payload,
  )
  return response.data
}

export async function fetchPatientGlucoseTrend(patientId: number, days = 7) {
  const response = await request.get<ApiResponse<GlucoseTrend>>(
    `/patients/${patientId}/glucose-trend`,
    { params: { days } },
  )
  return response.data
}

export async function fetchPatientGlucoseStats(patientId: number, days = 30) {
  const response = await request.get<ApiResponse<GlucoseStats>>(
    `/patients/${patientId}/glucose-stats`,
    { params: { days } },
  )
  return response.data
}
