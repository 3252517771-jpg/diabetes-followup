import { Button, Result } from 'antd'

interface QueryStateAlertProps {
  title?: string
  description: string
  onRetry?: () => void
}

export function QueryStateAlert({
  title = '数据加载失败',
  description,
  onRetry,
}: QueryStateAlertProps) {
  return (
    <Result
      status="warning"
      title={title}
      subTitle={description}
      extra={
        onRetry ? (
          <Button type="primary" onClick={onRetry}>
            重新加载
          </Button>
        ) : undefined
      }
    />
  )
}
