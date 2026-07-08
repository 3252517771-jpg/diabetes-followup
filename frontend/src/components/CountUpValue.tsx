import { useEffect, useState } from 'react'

interface CountUpValueProps {
  value: number
  duration?: number
  suffix?: string
  precision?: number
}

export function CountUpValue({
  value,
  duration = 720,
  suffix,
  precision = 0,
}: CountUpValueProps) {
  const [displayValue, setDisplayValue] = useState(value)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setDisplayValue(value)
      return
    }

    const start = performance.now()
    const initial = displayValue

    let frameId = 0

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = initial + (value - initial) * eased

      setDisplayValue(next)

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick)
      }
    }

    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  }, [duration, value])

  return (
    <span>
      {displayValue.toFixed(precision)}
      {suffix ?? ''}
    </span>
  )
}
