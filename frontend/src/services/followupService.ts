import { request } from './request'
import type { ApiResponse, PageData } from '../types/common'
import type {
  FollowupPlan,
  FollowupPlanFormValues,
  FollowupPlanListParams,
  FollowupTemplate,
  FollowupTemplateFormValues,
  FollowupTemplateListParams,
} from '../types/followup'

export async function fetchFollowupTemplates(params: FollowupTemplateListParams) {
  const response = await request.get<ApiResponse<PageData<FollowupTemplate>>>(
    '/followup/templates',
    { params },
  )
  return response.data
}

export async function fetchFollowupTemplate(templateId: number) {
  const response = await request.get<ApiResponse<FollowupTemplate>>(
    `/followup/templates/${templateId}`,
  )
  return response.data
}

export async function createFollowupTemplate(payload: FollowupTemplateFormValues) {
  const response = await request.post<ApiResponse<FollowupTemplate>>(
    '/followup/templates',
    payload,
  )
  return response.data
}

export async function updateFollowupTemplate(
  templateId: number,
  payload: FollowupTemplateFormValues,
) {
  const response = await request.put<ApiResponse<FollowupTemplate>>(
    `/followup/templates/${templateId}`,
    payload,
  )
  return response.data
}

export async function deleteFollowupTemplate(templateId: number) {
  const response = await request.delete<ApiResponse<{ success: boolean }>>(
    `/followup/templates/${templateId}`,
  )
  return response.data
}

export async function copyFollowupTemplate(templateId: number) {
  const response = await request.post<ApiResponse<FollowupTemplate>>(
    `/followup/templates/${templateId}/copy`,
  )
  return response.data
}

export async function fetchFollowupPlans(params: FollowupPlanListParams) {
  const response = await request.get<ApiResponse<PageData<FollowupPlan>>>('/followup/plans', {
    params,
  })
  return response.data
}

export async function createFollowupPlan(payload: FollowupPlanFormValues) {
  const response = await request.post<ApiResponse<FollowupPlan>>('/followup/plans', payload)
  return response.data
}

export async function updateFollowupPlan(
  planId: number,
  payload: Partial<Pick<FollowupPlan, 'name' | 'start_date' | 'end_date' | 'current_stage' | 'status'>>,
) {
  const response = await request.put<ApiResponse<FollowupPlan>>(
    `/followup/plans/${planId}`,
    payload,
  )
  return response.data
}
