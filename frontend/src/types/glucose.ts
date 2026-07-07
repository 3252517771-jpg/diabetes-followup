import type { PageParams } from './common'

export type GlucoseCategory = 'fasting' | 'postprandial' | 'bedtime' | 'random'

export interface BloodGlucoseRecord {
  id: number
  patient_id: number
  patient_name: string | null
  value: number | string
  measure_time: string
  category: GlucoseCategory
  is_abnormal: boolean
  abnormal_reason: 'low' | 'high' | null
  source: 'patient' | 'staff' | string
  notes: string | null
  created_at: string
}

export interface BloodGlucoseRecordFormValues {
  value: number
  measure_time: string
  category: GlucoseCategory
  notes: string | null
}

export interface GlucoseTrendPoint {
  date: string
  fasting_avg: number | null
  postprandial_avg: number | null
  bedtime_avg: number | null
  random_avg: number | null
}

export interface GlucoseTrend {
  days: number
  points: GlucoseTrendPoint[]
  compliance_rate: number
}

export interface GlucoseStats {
  days: number
  total_records: number
  abnormal_count: number
  abnormal_rate: number
  fasting_avg: number | null
  postprandial_avg: number | null
  bedtime_avg: number | null
  random_avg: number | null
  latest_record: BloodGlucoseRecord | null
}

export interface GlucoseOverview {
  days: number
  patient_count: number
  total_records: number
  abnormal_count: number
  abnormal_rate: number
  category_distribution: Record<GlucoseCategory, number>
  daily_record_counts: Array<{ date: string; count: number }>
  recent_abnormal_records: BloodGlucoseRecord[]
}

export interface GlucoseRecordListParams extends PageParams {
  date?: string
  category?: GlucoseCategory
}
