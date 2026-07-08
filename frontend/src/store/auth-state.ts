import { createContext } from 'react'

import type { UserInfo } from '../types/auth'

export interface AuthContextValue {
  isAuthenticated: boolean
  user: UserInfo | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
