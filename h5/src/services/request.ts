const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api'

interface ApiEnvelope<T> {
  code: number
  message: string
  data: T | null
}

interface ErrorEnvelope {
  code?: number
  message?: string
  detail?: string
  data?: null
}

export async function request<T>(path: string, options?: RequestInit) {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options)
  } catch {
    throw new Error('网络连接失败，请确认后端服务已启动')
  }

  const rawText = await response.text()
  let payload: ApiEnvelope<T> | ErrorEnvelope

  try {
    payload = rawText
      ? (JSON.parse(rawText) as ApiEnvelope<T> | ErrorEnvelope)
      : { code: response.status, message: '', data: null }
  } catch {
    throw new Error('服务响应格式异常，请稍后重试')
  }

  if (!response.ok) {
    const detail = 'detail' in payload ? payload.detail : undefined
    throw new Error(payload.message || detail || `请求失败 (${response.status})`)
  }

  return payload as ApiEnvelope<T>
}
