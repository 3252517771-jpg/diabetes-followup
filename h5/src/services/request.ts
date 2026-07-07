const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api'

export async function request<T>(path: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, options)
  const payload = (await response.json()) as { code: number; message: string; data: T | null }

  if (!response.ok) {
    throw new Error(payload.message || `请求失败 (${response.status})`)
  }

  return payload
}
