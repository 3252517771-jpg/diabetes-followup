export interface PatientTag {
  id: number
  name: string
  color: string | null
}

export interface ResponsibleDoctor {
  id: number
  real_name: string
  department: string | null
}

export interface PatientSummary {
  id: number
  name: string
  gender: number | null
  age: number | null
  phone: string | null
  diagnosis_type: string | null
  severity: string | null
  status: string
  responsible_doctor: ResponsibleDoctor | null
  tags: PatientTag[]
  created_at: string
  updated_at: string
}

export interface PatientDetail extends PatientSummary {
  notes: string | null
  server_chan_key: string | null
}

export interface PatientListParams {
  page: number
  size: number
  search?: string
  tag?: number
  status?: string
  diagnosis_type?: string
  severity?: string
}

export interface PatientFormValues {
  name: string
  gender: number | null
  age: number | null
  phone: string | null
  diagnosis_type: string | null
  severity: string | null
  status: string
  notes: string | null
  server_chan_key: string | null
  tag_ids: number[]
}
