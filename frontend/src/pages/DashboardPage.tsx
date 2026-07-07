import { Button, Card, Col, Row, Statistic, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'

import { ROUTE_PATHS } from '../config/routes'

export function DashboardPage() {
  const navigate = useNavigate()

  return (
    <div className="dashboard-shell">
      <div className="dashboard-intro">
        <Typography.Text className="dashboard-kicker">Milestone M2</Typography.Text>
        <Typography.Title level={2} className="dashboard-title">
          工作台
        </Typography.Title>
        <Typography.Paragraph className="dashboard-subtitle">
          当前阶段以患者管理为主，列表、详情和新建编辑流程都走真实 FastAPI 接口。
        </Typography.Paragraph>
        <Button type="primary" onClick={() => navigate(ROUTE_PATHS.patients)}>
          进入患者管理
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card>
            <Statistic title="当前里程碑" value="M2" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="后端状态" value="患者接口已接通" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="联调方式" value="真实 API" />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
