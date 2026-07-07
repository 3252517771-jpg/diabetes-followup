import { request } from './request'
import type { ApiResponse } from '../types/common'
import type {
  DashboardGlucoseTrend,
  DashboardPatientOverview,
  DashboardStats,
} from '../types/dashboard'

export async function fetchDashboardStats() {
  const response = await request.get<ApiResponse<DashboardStats>>('/dashboard/stats')
  return response.data
}

export async function fetchDashboardTrend(days = 7) {
  const response = await request.get<ApiResponse<DashboardGlucoseTrend>>('/dashboard/glucose-trend', {
    params: { days },
  })
  return response.data
}

export async function fetchDashboardDistribution() {
  const response = await request.get<ApiResponse<DashboardPatientOverview>>(
    '/dashboard/patient-distribution',
  )
  return response.data
}
