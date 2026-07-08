import axios from 'axios'

import { API_BASE_URL } from '../config/api'
import { ROUTE_PATHS } from '../config/routes'
import { clearSession, getStoredToken } from '../store/authStorage'

export const request = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

request.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const payload = error.response?.data as
        | {
            message?: string
            detail?: Array<{ msg?: string; loc?: Array<string | number> }> | string
          }
        | undefined

      if (status === 401) {
        clearSession()
        if (window.location.pathname !== ROUTE_PATHS.login) {
          window.location.replace(ROUTE_PATHS.login)
        }
      }

      if (Array.isArray(payload?.detail) && payload.detail.length > 0) {
        const issue = payload.detail[0]
        const path = Array.isArray(issue.loc) ? issue.loc.join('.') : 'request'
        throw new Error(`${path}: ${issue.msg ?? '请求格式错误'}`)
      }

      if (typeof payload?.detail === 'string' && payload.detail) {
        throw new Error(payload.detail)
      }

      if (payload?.message) {
        throw new Error(payload.message)
      }

      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试')
      }
    }

    throw new Error('网络连接异常，请确认后端服务已启动')
  },
)
