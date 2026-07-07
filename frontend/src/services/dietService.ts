import { request } from './request'
import type { ApiResponse, PageData } from '../types/common'
import type {
  DietRecommendation,
  DietRecommendationGeneratePayload,
  DietRecommendationListParams,
  DietRecommendationReviewPayload,
} from '../types/diet'

export async function generateDietRecommendation(payload: DietRecommendationGeneratePayload) {
  const response = await request.post<ApiResponse<DietRecommendation>>('/diet/recommend', payload)
  return response.data
}

export async function fetchDietRecommendations(params: DietRecommendationListParams) {
  const response = await request.get<ApiResponse<PageData<DietRecommendation>>>(
    '/diet/recommendations',
    { params },
  )
  return response.data
}

export async function fetchDietRecommendation(recommendationId: number) {
  const response = await request.get<ApiResponse<DietRecommendation>>(
    `/diet/recommendations/${recommendationId}`,
  )
  return response.data
}

export async function approveDietRecommendation(
  recommendationId: number,
  payload: DietRecommendationReviewPayload,
) {
  const response = await request.put<ApiResponse<DietRecommendation>>(
    `/diet/recommendations/${recommendationId}/approve`,
    payload,
  )
  return response.data
}

export async function rejectDietRecommendation(
  recommendationId: number,
  payload: DietRecommendationReviewPayload,
) {
  const response = await request.put<ApiResponse<DietRecommendation>>(
    `/diet/recommendations/${recommendationId}/reject`,
    payload,
  )
  return response.data
}
