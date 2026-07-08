import { useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'

import { login as loginRequest } from '../services/authService'
import { AuthContext } from './auth-state'
import { clearSession, getStoredToken, getStoredUser, persistSession } from './authStorage'

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState(getStoredUser())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!getStoredToken()) {
      clearSession()
      setUser(null)
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
    clearSession()
    setUser(null)
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
