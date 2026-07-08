import type { ReactNode } from 'react'

interface GlucoseSummaryItem {
  label: string
  value: ReactNode
  hint?: string
}

interface GlucoseSummaryPanelProps {
  items: GlucoseSummaryItem[]
  className?: string
}

export function GlucoseSummaryPanel({ items, className }: GlucoseSummaryPanelProps) {
  return (
    <div className={['glucose-summary-panel', className].filter(Boolean).join(' ')}>
      {items.map((item) => (
        <div key={item.label} className="glucose-summary-panel__item">
          <span className="glucose-summary-panel__label">{item.label}</span>
          <strong className="glucose-summary-panel__value">{item.value}</strong>
          {item.hint ? <span className="glucose-summary-panel__hint">{item.hint}</span> : null}
        </div>
      ))}
    </div>
  )
}
