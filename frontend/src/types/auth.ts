import type { ApiResponse } from './common'

export interface UserInfo {
  id: number
  username: string
  real_name: string
  department: string | null
  status: number
  roles: string[]
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: UserInfo
}

export type { ApiResponse }
