import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import {
  fetchPatientInfo,
  fetchPatientTasks,
  fetchRecentPatientGlucose,
  submitPatientGlucose,
  updatePatientGlucose,
  type H5PatientInfo,
  type H5RecentGlucoseRecord,
  type H5TaskItem,
} from '../services/h5Service'

const glucoseCategories = [
  { value: 'fasting', label: '空腹' },
  { value: 'postprandial', label: '餐后' },
  { value: 'bedtime', label: '睡前' },
  { value: 'random', label: '随机' },
]

const phoneStoragePrefix = 'h5_phone_last4:'

interface GlucoseFormValues {
  value: string
  category: string
  measure_time: string
  notes: string
}

function createInitialFormValues(defaultTime: string): GlucoseFormValues {
  return {
    value: '',
    category: 'fasting',
    measure_time: defaultTime,
    notes: '',
  }
}

function getStoredPhoneLast4(token: string) {
  if (!token) {
    return ''
  }
  return sessionStorage.getItem(`${phoneStoragePrefix}${token}`) ?? ''
}

function savePhoneLast4(token: string, phoneLast4: string) {
  if (!token) {
    return
  }
  sessionStorage.setItem(`${phoneStoragePrefix}${token}`, phoneLast4)
}

function getPatientMeta(patient: H5PatientInfo | null) {
  if (!patient) {
    return '请先完成手机号后四位校验'
  }
  const ageText = patient.age ?? '--'
  return `${patient.name} · ${ageText} 岁 · 手机尾号 ${patient.phone_masked ?? '未配置'}`
}

function getCategoryLabel(category: string) {
  return glucoseCategories.find((item) => item.value === category)?.label ?? category
}

function formatMeasureTime(value: string) {
  return value.slice(0, 16).replace('T', ' ')
}

function getRecordStatus(record: H5RecentGlucoseRecord) {
  if (!record.is_abnormal) {
    return { label: '达标', className: 'is-normal' }
  }
  return {
    label: record.abnormal_reason === 'low' ? '偏低' : '偏高',
    className: 'is-abnormal',
  }
}

export function GlucoseEntryPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [patient, setPatient] = useState<H5PatientInfo | null>(null)
  const [tasks, setTasks] = useState<H5TaskItem[]>([])
  const [recentRecords, setRecentRecords] = useState<H5RecentGlucoseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null)
  const [phoneLast4, setPhoneLast4] = useState('')
  const [verifyInput, setVerifyInput] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)

  const defaultTime = useMemo(() => new Date().toISOString().slice(0, 16), [])
  const [formValues, setFormValues] = useState<GlucoseFormValues>(() => createInitialFormValues(defaultTime))

  useEffect(() => {
    setFormValues(createInitialFormValues(defaultTime))
  }, [defaultTime])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('缺少访问令牌，请从医生发送的链接重新进入。')
      return
    }

    const storedLast4 = getStoredPhoneLast4(token)
    if (!storedLast4) {
      setLoading(false)
      return
    }

    setVerifyInput(storedLast4)
    void bootstrap(storedLast4)
  }, [token])

  const pendingTaskCount = tasks.length

  async function bootstrap(resolvedPhoneLast4: string) {
    if (!token) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const patientResponse = await fetchPatientInfo(token, resolvedPhoneLast4)
      setPatient(patientResponse.data)
      setPhoneLast4(resolvedPhoneLast4)
      setVerified(true)
      savePhoneLast4(token, resolvedPhoneLast4)
    } catch (requestError) {
      setPatient(null)
      setTasks([])
      setRecentRecords([])
      setVerified(false)
      setPhoneLast4('')
      setError(requestError instanceof Error ? requestError.message : '患者信息加载失败')
      setLoading(false)
      return
    }

    const [taskResult, recentResult] = await Promise.allSettled([
      fetchPatientTasks(token, resolvedPhoneLast4),
      fetchRecentPatientGlucose(token, resolvedPhoneLast4),
    ])

    if (taskResult.status === 'fulfilled') {
      setTasks(taskResult.value.data ?? [])
    } else {
      setTasks([])
      setError(taskResult.reason instanceof Error ? taskResult.reason.message : '待办加载失败')
    }

    if (recentResult.status === 'fulfilled') {
      setRecentRecords(recentResult.value.data ?? [])
    } else {
      setRecentRecords([])
      setError(recentResult.reason instanceof Error ? recentResult.reason.message : '近期记录加载失败')
    }

    setLoading(false)
  }

  async function refreshData() {
    if (!token || !phoneLast4) {
      return
    }

    const [taskResult, recentResult] = await Promise.allSettled([
      fetchPatientTasks(token, phoneLast4),
      fetchRecentPatientGlucose(token, phoneLast4),
    ])

    if (taskResult.status === 'fulfilled') {
      setTasks(taskResult.value.data ?? [])
    }

    if (recentResult.status === 'fulfilled') {
      setRecentRecords(recentResult.value.data ?? [])
    }
  }

  function resetForm() {
    setEditingRecordId(null)
    setFormValues(createInitialFormValues(defaultTime))
  }

  function startEditing(record: H5RecentGlucoseRecord) {
    setEditingRecordId(record.id)
    setMessage(null)
    setError(null)
    setFormValues({
      value: String(record.value),
      category: record.category,
      measure_time: record.measure_time.slice(0, 16),
      notes: record.notes ?? '',
    })
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = verifyInput.replace(/\D/g, '').slice(0, 4)
    if (normalized.length !== 4) {
      setError('请输入手机号后四位。')
      return
    }
    setVerifying(true)
    setError(null)
    await bootstrap(normalized)
    setVerifying(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !phoneLast4) {
      return
    }

    setSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const payload = {
        value: Number(formValues.value),
        measure_time: formValues.measure_time,
        category: formValues.category,
        notes: formValues.notes.trim() || '',
      }

      const response = editingRecordId
        ? await updatePatientGlucose(token, phoneLast4, editingRecordId, payload)
        : await submitPatientGlucose(token, phoneLast4, payload)

      setMessage(
        editingRecordId
          ? `已更新记录，测量时间 ${formatMeasureTime(response.data?.measure_time ?? formValues.measure_time)}`
          : response.data
            ? `已提交 ${response.data.value} mmol/L，记录时间 ${formatMeasureTime(response.data.measure_time)}`
            : '血糖记录已提交',
      )

      resetForm()
      await refreshData()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="h5-shell">
      <section className="h5-card h5-card--hero">
        <div className="h5-hero-copy">
          <p className="h5-kicker">Patient H5</p>
          <h1>血糖录入</h1>
          <p className="h5-muted">{loading ? '正在同步患者信息...' : getPatientMeta(patient)}</p>
        </div>

        <Link className="h5-link" to={`/h5/notifications?token=${encodeURIComponent(token)}`}>
          查看通知
        </Link>
      </section>

      {!verified ? (
        <section className="h5-card">
          <div className="h5-section-head">
            <h2>身份校验</h2>
            <span className="h5-inline-hint">请输入患者手机号后四位</span>
          </div>
          <form className="h5-form" onSubmit={handleVerify}>
            <label>
              <span>手机号后四位</span>
              <input
                name="phone_last4"
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="例如 0000"
                value={verifyInput}
                onChange={(event) => setVerifyInput(event.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </label>

            <div className="h5-form-actions">
              <button type="submit" disabled={verifying || loading || !token}>
                {verifying ? '校验中...' : '验证并进入'}
              </button>
            </div>
          </form>
          {error ? <p className="h5-error">{error}</p> : null}
        </section>
      ) : null}

      {verified && patient ? (
        <>
          <section className="h5-card h5-card--summary">
            <div className="h5-summary-grid">
              <div className="h5-summary-item">
                <span className="h5-summary-item__label">患者</span>
                <strong>{patient.name}</strong>
              </div>
              <div className="h5-summary-item">
                <span className="h5-summary-item__label">待办</span>
                <strong>{pendingTaskCount} 项</strong>
              </div>
              <div className="h5-summary-item">
                <span className="h5-summary-item__label">近期记录</span>
                <strong>{recentRecords.length} 条</strong>
              </div>
            </div>
          </section>

          {tasks.length ? (
            <section className="h5-card">
              <div className="h5-section-head">
                <h2>今日待办</h2>
                <span className="h5-inline-hint">{tasks.length} 项</span>
              </div>
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
            <div className="h5-section-head">
              <h2>{editingRecordId ? '编辑近期记录' : '录入本次血糖'}</h2>
              <span className="h5-inline-hint">{editingRecordId ? '保存后覆盖原记录' : '完成后同步到系统'}</span>
            </div>

            <form className="h5-form" onSubmit={handleSubmit}>
              <label>
                <span>血糖值（mmol/L）</span>
                <input
                  name="value"
                  type="number"
                  min="0.1"
                  max="50"
                  step="0.1"
                  placeholder="例如 6.8"
                  required
                  value={formValues.value}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, value: event.target.value }))}
                />
              </label>

              <div className="h5-form-grid">
                <label>
                  <span>测量分类</span>
                  <select
                    name="category"
                    value={formValues.category}
                    onChange={(event) => setFormValues((prev) => ({ ...prev, category: event.target.value }))}
                  >
                    {glucoseCategories.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>测量时间</span>
                  <input
                    name="measure_time"
                    type="datetime-local"
                    required
                    value={formValues.measure_time}
                    onChange={(event) => setFormValues((prev) => ({ ...prev, measure_time: event.target.value }))}
                  />
                </label>
              </div>

              <label>
                <span>备注</span>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="例如 餐后 2 小时测量，已步行 20 分钟"
                  value={formValues.notes}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </label>

              <div className="h5-form-actions">
                {editingRecordId ? (
                  <button type="button" className="h5-secondary-button" onClick={resetForm} disabled={submitting}>
                    取消编辑
                  </button>
                ) : null}
                <button type="submit" disabled={submitting || loading || !token}>
                  {submitting ? '提交中...' : editingRecordId ? '保存修改' : '提交血糖'}
                </button>
              </div>
            </form>

            {message ? <p className="h5-success">{message}</p> : null}
            {error ? <p className="h5-error">{error}</p> : null}
          </section>

          {recentRecords.length ? (
            <section className="h5-card">
              <div className="h5-section-head">
                <h2>近期记录</h2>
                <span className="h5-inline-hint">点击记录可编辑</span>
              </div>
              <div className="h5-record-list">
                {recentRecords.map((record) => {
                  const status = getRecordStatus(record)
                  const isEditing = editingRecordId === record.id
                  return (
                    <article key={record.id} className={`h5-record-item${isEditing ? ' is-active' : ''}`}>
                      <div className="h5-record-item__top">
                        <div>
                          <strong>{formatMeasureTime(record.measure_time)}</strong>
                          <div className="h5-record-item__meta">
                            <span>{getCategoryLabel(record.category)}</span>
                            <span>{Number(record.value).toFixed(2)} mmol/L</span>
                          </div>
                        </div>
                        <span className={`h5-status-badge ${status.className}`}>{status.label}</span>
                      </div>

                      {record.notes ? <p className="h5-record-item__notes">{record.notes}</p> : null}

                      <div className="h5-record-item__actions">
                        <button type="button" className="h5-secondary-button" onClick={() => startEditing(record)}>
                          {isEditing ? '编辑中' : '编辑记录'}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  )
}
