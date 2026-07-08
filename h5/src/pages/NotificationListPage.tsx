import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import {
  fetchPatientInfo,
  fetchPatientNotifications,
  type H5NotificationItem,
  type H5PatientInfo,
} from '../services/h5Service'

const phoneStoragePrefix = 'h5_phone_last4:'

function getStoredPhoneLast4(token: string) {
  if (!token) {
    return ''
  }
  return sessionStorage.getItem(`${phoneStoragePrefix}${token}`) ?? ''
}

function getChannelLabel(channel: string) {
  return channel === 'server_chan' ? '微信提醒' : '系统通知'
}

function getStatusLabel(item: H5NotificationItem) {
  if (item.fail_reason) {
    return '发送失败'
  }
  if (item.status === 'read') {
    return '已读'
  }
  if (item.status === 'unread') {
    return '未读'
  }
  if (item.status === 'pushed' || item.status === 'sent') {
    return '已发送'
  }
  return item.status
}

function getStatusClassName(item: H5NotificationItem) {
  if (item.fail_reason) {
    return 'is-danger'
  }
  if (item.status === 'unread') {
    return 'is-warning'
  }
  return 'is-neutral'
}

export function NotificationListPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [patient, setPatient] = useState<H5PatientInfo | null>(null)
  const [items, setItems] = useState<H5NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const phoneLast4 = getStoredPhoneLast4(token)
    if (!token) {
      setLoading(false)
      setError('缺少访问令牌，请重新打开链接。')
      return
    }
    if (!phoneLast4) {
      setLoading(false)
      setError('请先从血糖录入页完成手机号后四位校验。')
      return
    }

    async function bootstrap() {
      setError(null)
      try {
        const [patientResponse, notificationsResponse] = await Promise.all([
          fetchPatientInfo(token, phoneLast4),
          fetchPatientNotifications(token, phoneLast4),
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

  const unreadCount = useMemo(
    () => items.filter((item) => item.status === 'unread' && !item.fail_reason).length,
    [items],
  )

  return (
    <main className="h5-shell">
      <section className="h5-card h5-card--hero">
        <div className="h5-hero-copy">
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

      {patient ? (
        <section className="h5-card h5-card--summary">
          <div className="h5-summary-grid">
            <div className="h5-summary-item">
              <span className="h5-summary-item__label">患者</span>
              <strong>{patient.name}</strong>
            </div>
            <div className="h5-summary-item">
              <span className="h5-summary-item__label">未读</span>
              <strong>{unreadCount} 条</strong>
            </div>
            <div className="h5-summary-item">
              <span className="h5-summary-item__label">总数</span>
              <strong>{items.length} 条</strong>
            </div>
          </div>
        </section>
      ) : null}

      <section className="h5-card">
        <div className="h5-section-head">
          <h2>消息列表</h2>
          <span className="h5-inline-hint">{loading ? '同步中' : `${items.length} 条`}</span>
        </div>

        {error ? <p className="h5-error">{error}</p> : null}
        {error ? (
          <button type="button" className="h5-secondary-button" onClick={() => window.location.reload()}>
            重新加载
          </button>
        ) : null}

        {!loading && !items.length && !error ? <p className="h5-muted">暂无通知。</p> : null}

        <div className="h5-notification-list">
          {items.map((item) => (
            <article key={item.id} className="h5-notification-item">
              <div className="h5-notification-top">
                <strong>{getChannelLabel(item.channel)}</strong>
                <span>{item.sent_at.slice(0, 16).replace('T', ' ')}</span>
              </div>

              <div className="h5-notification-meta">
                <span className={`h5-status-badge ${getStatusClassName(item)}`}>{getStatusLabel(item)}</span>
              </div>

              <p>{item.content}</p>

              <small>{item.fail_reason ? `失败原因：${item.fail_reason}` : `消息状态：${getStatusLabel(item)}`}</small>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
