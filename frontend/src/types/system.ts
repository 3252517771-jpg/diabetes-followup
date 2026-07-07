import type { PageParams } from './common'

export interface SystemUser {
  id: number
  username: string
  real_name: string
  phone: string | null
  department: string | null
  status: number
  role_code: string
  created_at: string
  updated_at: string
}

export interface SystemUserListParams extends PageParams {
  role?: string
  department?: string
}

export interface SystemUserCreatePayload {
  username: string
  password: string
  real_name: string
  phone?: string | null
  department?: string | null
  role_code: string
  status: number
}

export interface SystemUserUpdatePayload {
  real_name: string
  phone?: string | null
  department?: string | null
  role_code: string
  status: number
}

export interface SystemConfigItem {
  id: number
  config_key: string
  config_value: string
  description: string | null
  updated_at: string
}

export interface SystemConfigUpdatePayload {
  config_key: string
  config_value: string
  description?: string | null
}
