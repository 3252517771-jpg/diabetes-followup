import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'

import {
  fetchPatientInfo,
  fetchPatientNotifications,
  type H5NotificationItem,
  type H5PatientInfo,
} from '../services/h5Service'

export function NotificationListPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [patient, setPatient] = useState<H5PatientInfo | null>(null)
  const [items, setItems] = useState<H5NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('缺少访问令牌，请重新打开链接。')
      return
    }

    async function bootstrap() {
      try {
        const [patientResponse, notificationsResponse] = await Promise.all([
          fetchPatientInfo(token),
          fetchPatientNotifications(token),
        ])
        setPatient(patientResponse.data)
        setItems(notificationsResponse.data ?? [])
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : '通知加载失败')
      } finally {
        setLoading(false)
      }
    }

    void bootstrap()
  }, [token])

  return (
    <main className="h5-shell">
      <section className="h5-card h5-card--hero">
        <div>
          <p className="h5-kicker">Patient H5</p>
          <h1>通知查看</h1>
          <p className="h5-muted">
            {loading ? '正在同步通知...' : patient ? `${patient.name} 的最新提醒` : '请使用有效链接访问'}
          </p>
        </div>
        <Link className="h5-link" to={`/h5/glucose?token=${encodeURIComponent(token)}`}>
          返回录入
        </Link>
      </section>

      <section className="h5-card">
        <h2>消息列表</h2>
        {error ? <p className="h5-error">{error}</p> : null}
        {!loading && !items.length && !error ? <p className="h5-muted">暂无通知。</p> : null}
        <div className="h5-notification-list">
          {items.map((item) => (
            <article key={item.id} className="h5-notification-item">
              <div className="h5-notification-top">
                <strong>{item.channel === 'server_chan' ? '微信推送' : '系统通知'}</strong>
                <span>{item.sent_at.slice(0, 16).replace('T', ' ')}</span>
              </div>
              <p>{item.content}</p>
              <small>{item.fail_reason ? `失败原因：${item.fail_reason}` : `状态：${item.status}`}</small>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
