import { useContext } from 'react'

import { AuthContext } from '../store/auth-state'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
