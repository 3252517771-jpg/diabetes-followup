import { useMemo, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { Avatar, Space, Tag, Typography } from 'antd'
import { UserOutlined } from '@ant-design/icons'

import './ProfileCard.css'

interface ProfileCardProps {
  name: string
  roleLabel: string
  departmentLabel: string
  quote: string
  accentLabel: string
  children?: ReactNode
}

const MAX_ROTATE = 8

export function ProfileCard({
  name,
  roleLabel,
  departmentLabel,
  quote,
  accentLabel,
  children,
}: ProfileCardProps) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const reduceMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reduceMotion) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const percentX = (event.clientX - bounds.left) / bounds.width
    const percentY = (event.clientY - bounds.top) / bounds.height

    setRotation({
      x: (0.5 - percentY) * MAX_ROTATE,
      y: (percentX - 0.5) * MAX_ROTATE,
    })
  }

  function resetRotation() {
    setRotation({ x: 0, y: 0 })
  }

  return (
    <div
      className="profile-card"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetRotation}
      style={{
        transform: `perspective(1400px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
      }}
    >
      <div className="profile-card__glow" />
      <div className="profile-card__grid" />

      <div className="profile-card__header">
        <Typography.Text className="login-kicker">{accentLabel}</Typography.Text>
        <Tag bordered={false} className="profile-card__tag">
          {roleLabel}
        </Tag>
      </div>

      <div className="profile-card__body">
        <Space align="start" size={16}>
          <Avatar size={72} icon={<UserOutlined />} className="profile-card__avatar" />
          <div>
            <Typography.Title level={2} className="profile-card__name">
              {name}
            </Typography.Title>
            <Typography.Paragraph className="profile-card__meta">
              {departmentLabel}
            </Typography.Paragraph>
          </div>
        </Space>

        <Typography.Paragraph className="profile-card__quote">
          {quote}
        </Typography.Paragraph>
      </div>

      <div className="profile-card__content">{children}</div>

      <div className="profile-card__footer">
        <div className="profile-card__metric">
          <span className="profile-card__metric-value">24h</span>
          <span className="profile-card__metric-label">followup rhythm</span>
        </div>
        <div className="profile-card__metric">
          <span className="profile-card__metric-value">AI</span>
          <span className="profile-card__metric-label">diet review ready</span>
        </div>
      </div>
    </div>
  )
}
