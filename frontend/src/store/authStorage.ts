import type { LoginResponse, UserInfo } from '../types/auth'

export const USER_STORAGE_KEY = 'auth_user'
export const TOKEN_STORAGE_KEY = 'access_token'

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function getStoredUser() {
  const rawUser = window.localStorage.getItem(USER_STORAGE_KEY)
  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser) as UserInfo
  } catch {
    clearSession()
    return null
  }
}

export function persistSession(session: LoginResponse) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, session.access_token)
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user))
}

export function clearSession() {
  window.localStorage.removeItem(USER_STORAGE_KEY)
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
}
