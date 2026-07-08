import { useQuery } from '@tanstack/react-query'

import {
  fetchPatientGlucoseRecords,
  fetchPatientGlucoseStats,
  fetchPatientGlucoseTrend,
} from '../../services/glucoseService'
import type { GlucoseCategory } from '../../types/glucose'

interface UsePatientGlucoseDataOptions {
  patientId: number
  days?: number
  statsDays?: number
  category?: GlucoseCategory
}

export function usePatientGlucoseData({
  patientId,
  days = 14,
  statsDays = 30,
  category,
}: UsePatientGlucoseDataOptions) {
  const recordsQuery = useQuery({
    queryKey: ['patient-glucose-records', patientId, 1, 12, category ?? 'all'],
    queryFn: async () => {
      const response = await fetchPatientGlucoseRecords(patientId, {
        page: 1,
        size: 12,
        category,
      })
      if (!response.data) {
        throw new Error(response.message || '血糖记录加载失败')
      }
      return response.data
    },
  })

  const trendQuery = useQuery({
    queryKey: ['patient-glucose-trend', patientId, days],
    queryFn: async () => {
      const response = await fetchPatientGlucoseTrend(patientId, days)
      if (!response.data) {
        throw new Error(response.message || '血糖趋势加载失败')
      }
      return response.data
    },
  })

  const statsQuery = useQuery({
    queryKey: ['patient-glucose-stats', patientId, statsDays],
    queryFn: async () => {
      const response = await fetchPatientGlucoseStats(patientId, statsDays)
      if (!response.data) {
        throw new Error(response.message || '血糖统计加载失败')
      }
      return response.data
    },
  })

  return {
    recordsQuery,
    trendQuery,
    statsQuery,
  }
}
