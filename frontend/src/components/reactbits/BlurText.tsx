import { motion, type Transition } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'

type BlurTextProps = {
  text?: string
  className?: string
  as?: 'span' | 'div'
  delay?: number
  animateBy?: 'words' | 'letters'
  direction?: 'top' | 'bottom'
  threshold?: number
  rootMargin?: string
  stepDuration?: number
}

function buildKeyframes(
  from: Record<string, string | number>,
  steps: Array<Record<string, string | number>>,
) {
  const keys = new Set<string>([...Object.keys(from), ...steps.flatMap((step) => Object.keys(step))])
  const keyframes: Record<string, Array<string | number>> = {}

  keys.forEach((key) => {
    keyframes[key] = [from[key], ...steps.map((step) => step[key])]
  })

  return keyframes
}

export function BlurText({
  text = '',
  className,
  as = 'span',
  delay = 110,
  animateBy = 'letters',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
  stepDuration = 0.48,
}: BlurTextProps) {
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLParagraphElement | null>(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setInView(true)
      return
    }

    if (!ref.current) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(ref.current)

    return () => observer.disconnect()
  }, [rootMargin, threshold])

  const parts = useMemo(
    () => (animateBy === 'words' ? text.split(' ') : Array.from(text)),
    [animateBy, text],
  )

  const fromSnapshot = useMemo(
    () =>
      direction === 'top'
        ? { filter: 'blur(10px)', opacity: 0, y: -18 }
        : { filter: 'blur(10px)', opacity: 0, y: 18 },
    [direction],
  )

  const toSnapshots = useMemo(
    () => [
      {
        filter: 'blur(5px)',
        opacity: 0.55,
        y: direction === 'top' ? 4 : -4,
      },
      { filter: 'blur(0px)', opacity: 1, y: 0 },
    ],
    [direction],
  )

  const TagName = as
  const stepCount = toSnapshots.length + 1
  const times = Array.from({ length: stepCount }, (_, index) =>
    stepCount === 1 ? 0 : index / (stepCount - 1),
  )

  return (
    <TagName
      ref={ref as never}
      className={className}
      style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'baseline' }}
    >
      {parts.map((part, index) => {
        const transition: Transition = {
          duration: stepDuration * (stepCount - 1),
          times,
          delay: (index * delay) / 1000,
          ease: 'easeOut',
        }

        return (
          <motion.span
            key={`${part}-${index}`}
            initial={fromSnapshot}
            animate={inView ? buildKeyframes(fromSnapshot, toSnapshots) : fromSnapshot}
            transition={transition}
            style={{ display: 'inline-block', willChange: 'transform, filter, opacity' }}
          >
            {part === ' ' ? '\u00A0' : part}
            {animateBy === 'words' && index < parts.length - 1 ? '\u00A0' : null}
          </motion.span>
        )
      })}
    </TagName>
  )
}
