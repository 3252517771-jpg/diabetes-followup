import { Empty } from 'antd'

interface EmptyMotionProps {
  description: string
}

export function EmptyMotion({ description }: EmptyMotionProps) {
  return (
    <div className="reactbits-empty">
      <div className="reactbits-empty__pulse" />
      <Empty description={description} />
    </div>
  )
}
