import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PropsWithChildren } from 'react'

interface ScrollStackProps extends PropsWithChildren {
  className?: string
}

interface ScrollStackItemProps extends PropsWithChildren {
  index: number
  className?: string
}

export function ScrollStack({ children, className }: ScrollStackProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [stageHeight, setStageHeight] = useState<number>()

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const calculateHeight = () => {
      const cards = Array.from(
        container.querySelectorAll<HTMLElement>('.patient-section-card'),
      )

      if (!cards.length) {
        return
      }

      const tallestCard = Math.max(...cards.map((card) => card.getBoundingClientRect().height))
      const viewportAwareFloor = Math.max(window.innerHeight - 220, 560)
      const nextHeight = Math.max(Math.ceil(tallestCard + 20), viewportAwareFloor)

      setStageHeight(nextHeight)
    }

    calculateHeight()

    const resizeObserver = new ResizeObserver(() => {
      calculateHeight()
    })

    const cards = container.querySelectorAll<HTMLElement>('.patient-section-card')
    cards.forEach((card) => resizeObserver.observe(card))
    window.addEventListener('resize', calculateHeight)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', calculateHeight)
    }
  }, [children])

  return (
    <div
      ref={containerRef}
      className={['scroll-stack', className].filter(Boolean).join(' ')}
      style={
        stageHeight
          ? ({
              '--scroll-stack-stage-height': `${stageHeight}px`,
            } as CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  )
}

export function ScrollStackItem({ index, className, children }: ScrollStackItemProps) {
  return (
    <div
      className={['scroll-stack__item', className].filter(Boolean).join(' ')}
      style={{ '--stack-index': index } as CSSProperties}
    >
      {children}
    </div>
  )
}
