export interface DashboardStats {
  patient_count: number
  following_count: number
  compliance_rate: number
  todo_count: number
}

export interface DashboardTrendPoint {
  date: string
  fasting_avg: number | null
  postprandial_avg: number | null
}

export interface DashboardGlucoseTrend {
  days: number
  points: DashboardTrendPoint[]
}

export interface DashboardDistributionItem {
  status: string
  count: number
}

export interface DashboardPendingItem {
  key: string
  label: string
  count: number
}

export interface DashboardPatientOverview {
  status_distribution: DashboardDistributionItem[]
  pending_items: DashboardPendingItem[]
}
