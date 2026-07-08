import type { PropsWithChildren, ReactNode } from 'react'
import { Card, Space, Typography } from 'antd'

interface MagicBentoGridProps extends PropsWithChildren {
  className?: string
}

interface MagicBentoItemProps extends PropsWithChildren {
  title: string
  subtitle?: string
  extra?: ReactNode
  className?: string
}

export function MagicBentoGrid({ children, className }: MagicBentoGridProps) {
  return <div className={['magic-bento-grid', className].filter(Boolean).join(' ')}>{children}</div>
}

export function MagicBentoItem({
  title,
  subtitle,
  extra,
  className,
  children,
}: MagicBentoItemProps) {
  return (
    <Card className={['panel-card', 'magic-bento-card', className].filter(Boolean).join(' ')}>
      <div className="magic-bento-card__header">
        <div>
          <Typography.Title level={4} className="magic-bento-card__title">
            {title}
          </Typography.Title>
          {subtitle ? (
            <Typography.Paragraph className="magic-bento-card__subtitle">
              {subtitle}
            </Typography.Paragraph>
          ) : null}
        </div>
        {extra ? <div className="magic-bento-card__extra">{extra}</div> : null}
      </div>
      <div className="magic-bento-card__body">{children}</div>
    </Card>
  )
}

interface DashboardStatCardProps {
  label: string
  value: ReactNode
  hint?: string
  loading?: boolean
  accent?: 'blue' | 'green'
}

export function DashboardStatCard({
  label,
  value,
  hint,
  loading,
  accent = 'blue',
}: DashboardStatCardProps) {
  return (
    <Card
      loading={loading}
      className={['metric-card', 'dashboard-stat-card', `dashboard-stat-card--${accent}`].join(' ')}
    >
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Typography.Text className="dashboard-stat-card__label">{label}</Typography.Text>
        <Typography.Title level={2} className="dashboard-stat-card__value">
          {value}
        </Typography.Title>
        {hint ? <Typography.Text className="dashboard-stat-card__hint">{hint}</Typography.Text> : null}
      </Space>
    </Card>
  )
}
