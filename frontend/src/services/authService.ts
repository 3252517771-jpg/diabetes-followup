import { request } from './request'
import type { ApiResponse, LoginResponse } from '../types/auth'

interface LoginPayload {
  username: string
  password: string
}

interface RegisterPayload extends LoginPayload {
  real_name: string
  department?: string
  role_code?: string
}

export async function login(payload: LoginPayload) {
  const response = await request.post<ApiResponse<LoginResponse>>('/auth/login', payload)
  return response.data
}

export async function register(payload: RegisterPayload) {
  const response = await request.post<ApiResponse<LoginResponse>>('/auth/register', payload)
  return response.data
}
