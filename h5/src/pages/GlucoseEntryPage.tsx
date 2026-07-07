import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import {
  fetchPatientInfo,
  fetchPatientTasks,
  submitPatientGlucose,
  type H5PatientInfo,
  type H5TaskItem,
} from '../services/h5Service'

const glucoseCategories = [
  { value: 'fasting', label: '空腹' },
  { value: 'postprandial', label: '餐后' },
  { value: 'bedtime', label: '睡前' },
  { value: 'random', label: '随机' },
]

export function GlucoseEntryPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [patient, setPatient] = useState<H5PatientInfo | null>(null)
  const [tasks, setTasks] = useState<H5TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const defaultTime = useMemo(() => new Date().toISOString().slice(0, 16), [])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('缺少访问令牌，请从医生发送的链接重新进入。')
      return
    }

    async function bootstrap() {
      try {
        const [patientResponse, taskResponse] = await Promise.all([
          fetchPatientInfo(token),
          fetchPatientTasks(token),
        ])
        setPatient(patientResponse.data)
        setTasks(taskResponse.data ?? [])
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : '页面初始化失败')
      } finally {
        setLoading(false)
      }
    }

    void bootstrap()
  }, [token])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) {
      return
    }

    const form = event.currentTarget
    const formData = new FormData(form)
    setSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const response = await submitPatientGlucose(token, {
        value: Number(formData.get('value')),
        measure_time: String(formData.get('measure_time')),
        category: String(formData.get('category')),
        notes: String(formData.get('notes') || ''),
      })
      setMessage(
        response.data
          ? `已提交 ${response.data.value} mmol/L，记录时间 ${response.data.measure_time.slice(0, 16).replace('T', ' ')}`
          : '血糖记录已提交',
      )
      form.reset()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="h5-shell">
      <section className="h5-card h5-card--hero">
        <div>
          <p className="h5-kicker">Patient H5</p>
          <h1>血糖录入</h1>
          <p className="h5-muted">
            {loading
              ? '正在同步患者信息...'
              : patient
                ? `${patient.name} · ${patient.age ?? '--'} 岁`
                : '请使用有效链接访问'}
          </p>
        </div>
        <Link className="h5-link" to={`/h5/notifications?token=${encodeURIComponent(token)}`}>
          查看通知
        </Link>
      </section>

      {tasks.length ? (
        <section className="h5-card">
          <h2>今日待办</h2>
          <div className="h5-task-list">
            {tasks.map((task) => (
              <article key={task.key} className="h5-task-item">
                <strong>{task.title}</strong>
                <span>{task.description}</span>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="h5-card">
        <h2>录入本次血糖</h2>
        <form className="h5-form" onSubmit={handleSubmit}>
          <label>
            <span>血糖值（mmol/L）</span>
            <input name="value" type="number" min="0.1" max="50" step="0.1" required />
          </label>
          <label>
            <span>测量分类</span>
            <select name="category" defaultValue="fasting">
              {glucoseCategories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>测量时间</span>
            <input name="measure_time" type="datetime-local" defaultValue={defaultTime} required />
          </label>
          <label>
            <span>备注</span>
            <textarea name="notes" rows={3} placeholder="例如 饭后 2 小时测量" />
          </label>
          <button type="submit" disabled={submitting || loading || !token}>
            {submitting ? '提交中...' : '提交血糖'}
          </button>
        </form>

        {message ? <p className="h5-success">{message}</p> : null}
        {error ? <p className="h5-error">{error}</p> : null}
      </section>
    </main>
  )
}
