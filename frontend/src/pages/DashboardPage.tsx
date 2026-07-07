import { Card, Col, Row, Statistic, Typography } from 'antd'

export function DashboardPage() {
  return (
    <div className="dashboard-shell">
      <div className="dashboard-intro">
        <Typography.Text className="dashboard-kicker">Milestone M1</Typography.Text>
        <Typography.Title level={2} className="dashboard-title">
          工作台骨架
        </Typography.Title>
        <Typography.Paragraph className="dashboard-subtitle">
          这一页用于验证登录态、布局路由和 Ant Design Dub 主题已经接通，后续模块会在这里继续扩展。
        </Typography.Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card>
            <Statistic title="认证接口" value="已接通" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="数据库迁移" value="M1" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="前端状态" value="可联调" />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
