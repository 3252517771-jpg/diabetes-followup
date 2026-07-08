import { Flex, Typography } from 'antd'
import type { ReactNode } from 'react'

import { TextType } from './reactbits/TextType'

interface PageIntroProps {
  kicker: string
  title: string
  description: string
  extra?: ReactNode
  align?: 'start' | 'center'
  className?: string
}

export function PageIntro({
  kicker,
  title,
  description,
  extra,
  align = 'start',
  className,
}: PageIntroProps) {
  return (
    <Flex align={align} justify="space-between" className={['page-toolbar', className].filter(Boolean).join(' ')}>
      <div className="page-intro">
        <Typography.Text className="dashboard-kicker">{kicker}</Typography.Text>
        <Typography.Title level={2} className="panel-title page-intro__title">
          <TextType text={title} as="span" />
        </Typography.Title>
        <Typography.Paragraph className="panel-subtitle">{description}</Typography.Paragraph>
      </div>
      {extra ? <div className="page-intro__extra">{extra}</div> : null}
    </Flex>
  )
}
