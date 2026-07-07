import { createContext, useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'

import { login as loginRequest } from '../services/authService'
import type { LoginResponse, UserInfo } from '../types/auth'

interface AuthContextValue {
  isAuthenticated: boolean
  user: UserInfo | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const USER_STORAGE_KEY = 'auth_user'
const TOKEN_STORAGE_KEY = 'access_token'

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const cachedUser = window.localStorage.getItem(USER_STORAGE_KEY)
    const cachedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY)

    if (cachedUser && cachedToken) {
      setUser(JSON.parse(cachedUser) as UserInfo)
    }
    setIsLoading(false)
  }, [])

  async function login(username: string, password: string) {
    const response = await loginRequest({ username, password })
    if (!response.data) {
      throw new Error(response.message || '登录失败')
    }
    persistSession(response.data)
  }

  function logout() {
    window.localStorage.removeItem(USER_STORAGE_KEY)
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    setUser(null)
  }

  function persistSession(session: LoginResponse) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, session.access_token)
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user))
    setUser(session.user)
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: Boolean(user),
        user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
