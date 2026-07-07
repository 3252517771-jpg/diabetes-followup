import type { PageParams } from './common'

export interface StageTask {
  id: number
  stage_id: number
  task_type: string
  executor: string
  frequency: string | null
  remind_before_minutes: number
  description: string | null
}

export interface StageTaskFormValues {
  task_type: string
  executor: string
  frequency: string | null
  remind_before_minutes: number
  description: string | null
}

export interface FollowupStage {
  id: number
  template_id: number
  stage_order: number
  stage_name: string
  start_day_offset: number
  duration_days: number
  tasks: StageTask[]
}

export interface FollowupStageFormValues {
  stage_order: number
  stage_name: string
  start_day_offset: number
  duration_days: number
  tasks: StageTaskFormValues[]
}

export interface FollowupTemplate {
  id: number
  name: string
  description: string | null
  applicable_type: string | null
  total_days: number | null
  creator_id: number | null
  is_public: boolean
  is_active: boolean
  stage_count: number
  task_count: number
  stages: FollowupStage[]
  created_at: string
  updated_at: string
}

export interface FollowupTemplateFormValues {
  name: string
  description: string | null
  applicable_type: string | null
  total_days: number | null
  is_public: boolean
  is_active?: boolean
  stages: FollowupStageFormValues[]
}

export interface FollowupTemplateListParams extends PageParams {
  scope?: 'public' | 'mine'
  search?: string
}

export interface FollowupPlan {
  id: number
  template_id: number | null
  patient_id: number
  patient_name: string | null
  creator_id: number
  name: string
  start_date: string
  end_date: string | null
  current_stage: number | null
  status: string
  progress_percent: number
  overdue_task_count: number
  template: FollowupTemplate | null
  created_at: string
  updated_at: string
}

export interface FollowupPlanFormValues {
  patient_id: number
  template_id: number | null
  name?: string | null
  start_date: string
  end_date?: string | null
}

export interface FollowupPlanListParams extends PageParams {
  patient_id?: number
  status?: string
}
