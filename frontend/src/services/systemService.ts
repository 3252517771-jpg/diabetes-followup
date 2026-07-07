import { request } from './request'
import type { ApiResponse, PageData } from '../types/common'
import type {
  SystemConfigItem,
  SystemConfigUpdatePayload,
  SystemUser,
  SystemUserCreatePayload,
  SystemUserListParams,
  SystemUserUpdatePayload,
} from '../types/system'

export async function fetchSystemUsers(params: SystemUserListParams) {
  const response = await request.get<ApiResponse<PageData<SystemUser>>>('/system/users', {
    params,
  })
  return response.data
}

export async function createSystemUser(payload: SystemUserCreatePayload) {
  const response = await request.post<ApiResponse<SystemUser>>('/system/users', payload)
  return response.data
}

export async function updateSystemUser(userId: number, payload: SystemUserUpdatePayload) {
  const response = await request.put<ApiResponse<SystemUser>>(`/system/users/${userId}`, payload)
  return response.data
}

export async function fetchSystemConfigs() {
  const response = await request.get<ApiResponse<SystemConfigItem[]>>('/system/config')
  return response.data
}

export async function updateSystemConfigs(payload: SystemConfigUpdatePayload[]) {
  const response = await request.put<ApiResponse<SystemConfigItem[]>>('/system/config', payload)
  return response.data
}
