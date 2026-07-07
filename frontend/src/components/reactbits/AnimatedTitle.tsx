import type { PropsWithChildren } from 'react'

interface AnimatedTitleProps extends PropsWithChildren {
  className?: string
}

export function AnimatedTitle({ children, className }: AnimatedTitleProps) {
  return <span className={`reactbits-title ${className ?? ''}`.trim()}>{children}</span>
}
