export interface ApiResponse<T> {
  code: number
  message: string
  data: T | null
}

export interface PageData<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export interface PageParams {
  page: number
  size: number
}
