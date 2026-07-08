const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api'

export async function request<T>(path: string, options?: RequestInit) {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options)
  } catch {
    throw new Error('网络连接失败，请确认后端服务已启动')
  }

  const rawText = await response.text()
  let payload: { code: number; message: string; data: T | null }

  try {
    payload = rawText
      ? (JSON.parse(rawText) as { code: number; message: string; data: T | null })
      : { code: response.status, message: '', data: null }
  } catch {
    throw new Error('服务响应格式异常，请稍后重试')
  }

  if (!response.ok) {
    throw new Error(payload.message || `请求失败 (${response.status})`)
  }

  return payload
}
