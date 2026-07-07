import { request } from './request'
import type { ApiResponse, PageData } from '../types/common'
import type {
  PatientDetail,
  PatientFormValues,
  PatientH5AccessLink,
  PatientListParams,
  PatientSummary,
  PatientTag,
} from '../types/patient'

export async function fetchPatients(params: PatientListParams) {
  const response = await request.get<ApiResponse<PageData<PatientSummary>>>('/patients', { params })
  return response.data
}

export async function fetchPatientDetail(patientId: number) {
  const response = await request.get<ApiResponse<PatientDetail>>(`/patients/${patientId}`)
  return response.data
}

export async function fetchPatientH5Access(patientId: number) {
  const response = await request.get<ApiResponse<PatientH5AccessLink>>(`/patients/${patientId}/h5-access`)
  return response.data
}

export async function createPatient(payload: PatientFormValues) {
  const response = await request.post<ApiResponse<PatientDetail>>('/patients', payload)
  return response.data
}

export async function updatePatient(patientId: number, payload: PatientFormValues) {
  const response = await request.put<ApiResponse<PatientDetail>>(`/patients/${patientId}`, payload)
  return response.data
}

export async function deletePatient(patientId: number) {
  const response = await request.delete<ApiResponse<{ success: boolean }>>(`/patients/${patientId}`)
  return response.data
}

export async function fetchTags() {
  const response = await request.get<ApiResponse<PatientTag[]>>('/tags')
  return response.data
}

export async function createTag(payload: { name: string; color: string | null }) {
  const response = await request.post<ApiResponse<PatientTag>>('/tags', payload)
  return response.data
}

export async function updateTag(tagId: number, payload: { name: string; color: string | null }) {
  const response = await request.put<ApiResponse<PatientTag>>(`/tags/${tagId}`, payload)
  return response.data
}

export async function assignPatientTags(patientId: number, tagIds: number[]) {
  const response = await request.post<ApiResponse<PatientTag[]>>(`/patients/${patientId}/tags`, {
    tag_ids: tagIds,
  })
  return response.data
}
