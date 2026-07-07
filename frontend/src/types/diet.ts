import type { PageParams } from './common'

export interface DietMealPlan {
  meal_type: string
  foods: string[]
  tips: string
}

export interface DietRecommendationContent {
  meals: DietMealPlan[]
  total_calories: number
  notes: string
}

export interface DietRecommendation {
  id: number
  patient_id: number
  patient_name: string | null
  generate_method: string
  content: DietRecommendationContent
  review_status: 'pending' | 'approved' | 'rejected'
  reviewer_id: number | null
  reviewer_name: string | null
  review_comment: string | null
  push_status: 'unpushed' | 'pushed' | 'failed'
  push_target_type: 'patient_key' | 'system_default' | 'missing'
  push_target_label: string
  created_at: string
  reviewed_at: string | null
}

export interface DietRecommendationListParams extends PageParams {
  patient_id?: number
  status?: 'pending' | 'approved' | 'rejected'
}

export interface DietRecommendationGeneratePayload {
  patient_id: number
  preferred_calories?: number
  additional_prompt?: string
}

export interface DietRecommendationReviewPayload {
  review_comment?: string
  edited_content?: DietRecommendationContent
}
