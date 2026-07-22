import { useEffect, useMemo, useState } from 'react'
import { Select } from '../components/Select'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'

/** 常用 IANA 时区（按地区分组展示用） */
const COMMON_ZONES = [
  'UTC',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Taipei',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Singapore',
  'Asia/Bangkok',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Australia/Sydney',
  'Pacific/Auckland',
] as const

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** 本地 datetime-local 值 */
function toLocalInputValue(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * 在指定时区格式化时间
 */
function formatInZone(ms: number, timeZone: string): {
  full: string
  isoLike: string
  offset: string
} {
  const d = new Date(ms)
  const full = new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  }).format(d)

  // 提取偏移量
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''

  const isoLike = `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
  let offset = get('timeZoneName') || ''
  // 统一 GMT+8 → UTC+08:00 风格展示
  if (offset.startsWith('GMT')) {
    offset = offset.replace('GMT', 'UTC')
  }

  return { full, isoLike, offset }
}

/**
 * 时间 / 时区转换工具
 */
export function TimezoneTool() {
  const localTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', [])
  const [now, setNow] = useState(() => Date.now())
  const [inputLocal, setInputLocal] = useState(() => toLocalInputValue(Date.now()))
  const [fromZone, setFromZone] = useState(localTz)
  const [toZone, setToZone] = useState('UTC')
  const [error, setError] = useState('')
  const { copy } = useCopyFeedback()

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  /** 将「某时区墙上时钟」粗略转为 UTC ms：用目标时区偏移差修正 */
  const instantMs = useMemo(() => {
    // 用户输入按本地 datetime 解析为“墙上时间”各字段
    const m = inputLocal.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
    )
    if (!m) return null
    const y = Number(m[1])
    const mo = Number(m[2]) - 1
    const day = Number(m[3])
    const h = Number(m[4])
    const mi = Number(m[5])
    const s = Number(m[6] ?? '0')

    // 先当作 UTC 构造，再减去 fromZone 相对 UTC 的偏移，得到真实瞬间
    const asUtc = Date.UTC(y, mo, day, h, mi, s)
    try {
      // 计算 fromZone 在该时刻附近的偏移（分钟）
      const probe = new Date(asUtc)
      const offsetMin = getTimeZoneOffsetMinutes(probe, fromZone)
      // 墙上时间 = UTC + offset → UTC = 墙上 - offset
      return asUtc - offsetMin * 60_000
    } catch {
      return null
    }
  }, [inputLocal, fromZone])

  useEffect(() => {
    setError(instantMs === null && inputLocal ? '无法解析时间或时区' : '')
  }, [instantMs, inputLocal])

  const zoneOptions = useMemo(() => {
    const set = new Set<string>([...COMMON_ZONES, localTz, fromZone, toZone])
    return [...set].sort().map((z) => ({ value: z, label: z }))
  }, [localTz, fromZone, toZone])

  function handleUseNow() {
    setInputLocal(toLocalInputValue(Date.now()))
    setFromZone(localTz)
  }

  const fromFmt = instantMs !== null ? formatInZone(instantMs, fromZone) : null
  const toFmt = instantMs !== null ? formatInZone(instantMs, toZone) : null
  const utcIso = instantMs !== null ? new Date(instantMs).toISOString() : ''

  return (
    <ToolPage
      title="时间 / 时区"
      description="多时区时间对照与转换。基于 IANA 时区，本地计算。"
      badge="离线"
    >
      <div className="panel">
        <div className="panel-head">
          <h2>当前时间</h2>
          <button type="button" className="btn btn-ghost" onClick={handleUseNow}>
            填入当前时间
          </button>
        </div>
        <p className="hint">本机时区：{localTz}</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(16rem, 1fr))',
            gap: '0.75rem',
            marginTop: '0.5rem',
          }}
        >
          {['UTC', localTz, 'Asia/Shanghai', 'America/New_York'].map((z) => {
            const f = formatInZone(now, z)
            return (
              <div key={z} className="field">
                <label>
                  {z} <span className="hint">{f.offset}</span>
                </label>
                <input readOnly value={f.isoLike} />
              </div>
            )
          })}
        </div>
      </div>

      <div className="panel" style={{ marginTop: '1rem' }}>
        <div className="panel-head">
          <h2>时区转换</h2>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))',
            gap: '0.75rem',
          }}
        >
          <div className="field">
            <label>时间（墙上时钟）</label>
            <input
              type="datetime-local"
              step={1}
              value={inputLocal}
              onChange={(e) => setInputLocal(e.target.value)}
            />
          </div>
          <div className="field">
            <label>源时区</label>
            <Select
              value={fromZone}
              onChange={setFromZone}
              options={zoneOptions}
              aria-label="源时区"
            />
          </div>
          <div className="field">
            <label>目标时区</label>
            <Select value={toZone} onChange={setToZone} options={zoneOptions} aria-label="目标时区" />
          </div>
        </div>

        {error ? <p className="error-msg">{error}</p> : null}

        {fromFmt && toFmt && instantMs !== null ? (
          <div className="field-stack" style={{ marginTop: '1rem' }}>
            <div className="field">
              <label>
                源时区结果（{fromZone} {fromFmt.offset}）
              </label>
              <div className="toolbar">
                <input readOnly value={`${fromFmt.isoLike}  ${fromFmt.full}`} style={{ flex: 1 }} />
                <button type="button" className="btn btn-ghost" onClick={() => void copy(fromFmt.isoLike)}>
                  复制
                </button>
              </div>
            </div>
            <div className="field">
              <label>
                目标时区结果（{toZone} {toFmt.offset}）
              </label>
              <div className="toolbar">
                <input readOnly value={`${toFmt.isoLike}  ${toFmt.full}`} style={{ flex: 1 }} />
                <button type="button" className="btn btn-ghost" onClick={() => void copy(toFmt.isoLike)}>
                  复制
                </button>
              </div>
            </div>
            <div className="field">
              <label>UTC ISO</label>
              <div className="toolbar">
                <input readOnly value={utcIso} style={{ flex: 1 }} />
                <button type="button" className="btn btn-ghost" onClick={() => void copy(utcIso)}>
                  复制
                </button>
              </div>
            </div>
            <div className="field">
              <label>Unix 秒 / 毫秒</label>
              <div className="toolbar">
                <input
                  readOnly
                  value={`${Math.floor(instantMs / 1000)} / ${instantMs}`}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => void copy(String(Math.floor(instantMs / 1000)))}
                >
                  复制秒
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="panel" style={{ marginTop: '1rem' }}>
        <div className="panel-head">
          <h2>常用时区一览（当前瞬间）</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  时区
                </th>
                <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  偏移
                </th>
                <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  本地时间
                </th>
                <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {COMMON_ZONES.map((z) => {
                const f = formatInZone(now, z)
                return (
                  <tr key={z}>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>{z}</td>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                      {f.offset}
                    </td>
                    <td
                      style={{
                        padding: '0.5rem',
                        borderBottom: '1px solid var(--border)',
                        fontFamily: 'var(--font-mono, monospace)',
                      }}
                    >
                      {f.isoLike}
                    </td>
                    <td
                      style={{
                        padding: '0.5rem',
                        borderBottom: '1px solid var(--border)',
                        textAlign: 'right',
                      }}
                    >
                      <button type="button" className="btn btn-ghost" onClick={() => void copy(f.isoLike)}>
                        复制
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ToolPage>
  )
}

/**
 * 获取 timeZone 在给定瞬间相对 UTC 的偏移（分钟）
 * 正数表示该时区比 UTC 快（东区）
 */
function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  // 用 formatToParts 得到该时区墙上时间，再与 UTC 分量比较
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = dtf.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0')

  // 某些环境 hour 可能为 24
  let hour = get('hour')
  if (hour === 24) hour = 0

  const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'))
  // asUTC 是「把墙上时间当 UTC」的时间戳；真实 date 的 getTime 与之差即为偏移
  return (asUTC - date.getTime()) / 60_000
}
