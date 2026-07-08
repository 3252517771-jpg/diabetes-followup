import { useEffect, useMemo, useState } from 'react'

import './TextType.css'

interface TextTypeProps {
  text: string
  as?: 'span' | 'div'
  className?: string
  speed?: number
  startDelay?: number
}

export function TextType({
  text,
  as = 'span',
  className,
  speed = 34,
  startDelay = 0,
}: TextTypeProps) {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setVisibleCount(text.length)
      return
    }

    setVisibleCount(0)

    const timeoutId = window.setTimeout(() => {
      let frameId = 0
      let index = 0

      const reveal = () => {
        index += 1
        setVisibleCount(index)
        if (index < text.length) {
          frameId = window.setTimeout(reveal, speed)
        }
      }

      reveal()

      return () => window.clearTimeout(frameId)
    }, startDelay)

    return () => window.clearTimeout(timeoutId)
  }, [speed, startDelay, text])

  const TagName = as
  const characters = useMemo(() => text.split(''), [text])

  return (
    <TagName className={['text-type', className].filter(Boolean).join(' ')}>
      {characters.map((character, index) => (
        <span
          key={`${character}-${index}`}
          className={index < visibleCount ? 'text-type__char is-visible' : 'text-type__char'}
        >
          {character === ' ' ? '\u00A0' : character}
        </span>
      ))}
      <span className={visibleCount >= text.length ? 'text-type__cursor is-hidden' : 'text-type__cursor'}>
        |
      </span>
    </TagName>
  )
}
