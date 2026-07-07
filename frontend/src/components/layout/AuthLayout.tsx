import type { PropsWithChildren } from 'react'

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="auth-shell">
      <div className="auth-panel">{children}</div>
    </div>
  )
}
