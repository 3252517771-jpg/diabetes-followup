export const ROUTE_PATHS = {
  dashboard: '/',
  login: '/login',
  patients: '/patients',
  patientCreate: '/patients/create',
  patientDetail: '/patients/:id',
  patientEdit: '/patients/:id/edit',
  glucoseOverview: '/glucose',
  followupTemplates: '/followup/templates',
  followupTemplateCreate: '/followup/templates/create',
  followupTemplateEdit: '/followup/templates/:id',
} as const
