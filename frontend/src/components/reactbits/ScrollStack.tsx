import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PropsWithChildren } from 'react'

const STICKY_BASE_TOP = 16
const STICKY_TOP_STEP = 28

function getScrollParent(node: HTMLElement) {
  let current: HTMLElement | null = node.parentElement

  while (current) {
    const { overflowY } = window.getComputedStyle(current)
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return current
    }
    current = current.parentElement
  }

  return null
}

interface ScrollStackProps extends PropsWithChildren {
  className?: string
  measureSelector?: string
  stagePadding?: number
  overlapOffset?: number
}

interface ScrollStackItemProps extends PropsWithChildren {
  index: number
  className?: string
}

export function ScrollStack({
  children,
  className,
  measureSelector = '.patient-section-card',
  stagePadding = 20,
  overlapOffset = 240,
}: ScrollStackProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [stageHeight, setStageHeight] = useState<number>()

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const calculateHeight = () => {
      const cards = Array.from(container.querySelectorAll<HTMLElement>(measureSelector))
      const items = Array.from(container.querySelectorAll<HTMLElement>('.scroll-stack__item'))
      const scrollParent = getScrollParent(container)

      if (!cards.length) {
        return
      }

      const tallestCard = Math.max(...cards.map((card) => card.getBoundingClientRect().height))
      const viewportHeight = scrollParent?.clientHeight ?? window.innerHeight
      const viewportAwareFloor = Math.max(viewportHeight - 64, 560)
      const nextHeight = Math.max(Math.ceil(tallestCard + stagePadding), viewportAwareFloor)
      const hiddenOverflows = cards.map((card, index) => {
        const stickyTop = STICKY_BASE_TOP + index * STICKY_TOP_STEP
        const availableHeight = Math.max(viewportHeight - stickyTop - 24, 240)
        return Math.max(card.getBoundingClientRect().height - availableHeight, 0)
      })

      items.forEach((item, index) => {
        const card = cards[index]
        if (!card) {
          item.classList.remove('scroll-stack__item--long')
          item.style.setProperty('--scroll-stack-entry-offset', '0px')
          return
        }

        if (hiddenOverflows[index] > 0) {
          item.classList.add('scroll-stack__item--long')
        } else {
          item.classList.remove('scroll-stack__item--long')
        }

        const previousOverflow = index === 0 ? 0 : hiddenOverflows[index - 1]
        item.style.setProperty('--scroll-stack-entry-offset', `${previousOverflow}px`)
      })

      setStageHeight(nextHeight)
    }

    calculateHeight()

    const resizeObserver = new ResizeObserver(() => {
      calculateHeight()
    })

    const cards = container.querySelectorAll<HTMLElement>(measureSelector)
    cards.forEach((card) => resizeObserver.observe(card))
    window.addEventListener('resize', calculateHeight)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', calculateHeight)
    }
  }, [children, measureSelector, stagePadding])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const scrollParent = getScrollParent(container)
    const scrollTarget: HTMLElement | Window = scrollParent ?? window
    let rafId = 0

    const updateCardShift = () => {
      rafId = 0

      const items = Array.from(container.querySelectorAll<HTMLElement>('.scroll-stack__item'))
      const cards = Array.from(container.querySelectorAll<HTMLElement>(measureSelector))
      const viewportHeight =
        scrollParent?.clientHeight ?? window.innerHeight
      const scrollTop =
        scrollParent?.scrollTop ??
        window.scrollY ??
        document.documentElement.scrollTop ??
        0

      const viewportTop =
        scrollParent?.getBoundingClientRect().top ?? 0

      items.forEach((item, index) => {
        const card = cards[index]
        if (!card || !item.classList.contains('scroll-stack__item--long')) {
          item.style.setProperty('--scroll-stack-card-shift', '0px')
          return
        }

        const stickyTop = STICKY_BASE_TOP + index * STICKY_TOP_STEP
        const availableHeight = Math.max(viewportHeight - stickyTop - 24, 240)
        const hiddenOverflow = Math.max(card.scrollHeight - availableHeight, 0)

        if (hiddenOverflow <= 0) {
          item.style.setProperty('--scroll-stack-card-shift', '0px')
          return
        }

        const itemTop =
          item.getBoundingClientRect().top - viewportTop + scrollTop
        const stickyStart = itemTop - stickyTop
        const shift = Math.min(Math.max(scrollTop - stickyStart, 0), hiddenOverflow)

        item.style.setProperty('--scroll-stack-card-shift', `${shift * -1}px`)
      })
    }

    const scheduleUpdate = () => {
      if (rafId) {
        return
      }
      rafId = window.requestAnimationFrame(updateCardShift)
    }

    scheduleUpdate()
    scrollTarget.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId)
      }
      scrollTarget.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [children, measureSelector])

  return (
    <div
      ref={containerRef}
      className={['scroll-stack', className].filter(Boolean).join(' ')}
      style={
        stageHeight
          ? ({
              '--scroll-stack-stage-height': `${stageHeight}px`,
              '--scroll-stack-overlap': `${overlapOffset}px`,
            } as CSSProperties)
          : ({
              '--scroll-stack-overlap': `${overlapOffset}px`,
            } as CSSProperties)
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
