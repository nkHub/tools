import { useEffect, useMemo, useState } from 'react'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'

/** 将输入解析为毫秒时间戳；支持秒/毫秒自动判断 */
function parseToMs(raw: string): number | null {
  const text = raw.trim()
  if (!text) return null

  // 纯数字：10 位当秒，13 位当毫秒，其它按数值长度粗判
  if (/^-?\d+$/.test(text)) {
    const n = Number(text)
    if (!Number.isFinite(n)) return null
    const abs = Math.abs(n)
    // 1e11 ≈ 1973 年秒级上限附近；小于此按秒处理
    if (abs < 1e11) return n * 1000
    return n
  }

  const d = new Date(text)
  const t = d.getTime()
  return Number.isNaN(t) ? null : t
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** 格式化为本地 YYYY-MM-DD HH:mm:ss.SSS */
function formatLocal(ms: number) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`
}

/** 格式化为 UTC 字符串 */
function formatUtc(ms: number) {
  const d = new Date(ms)
  return d.toISOString().replace('T', ' ').replace('Z', ' UTC')
}

/**
 * 时间戳转换工具
 * - 当前时间实时刷新
 * - 时间戳 ↔ 日期 双向转换
 */
export function TimestampTool() {
  const [now, setNow] = useState(() => Date.now())
  const [tsInput, setTsInput] = useState(() => String(Math.floor(Date.now() / 1000)))
  const [dateInput, setDateInput] = useState(() => formatLocal(Date.now()).slice(0, 19))
  const [error, setError] = useState('')
  const { copy } = useCopyFeedback()

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const tsResult = useMemo(() => {
    const ms = parseToMs(tsInput)
    if (ms === null) return null
    return {
      ms,
      sec: Math.floor(ms / 1000),
      local: formatLocal(ms),
      utc: formatUtc(ms),
      iso: new Date(ms).toISOString(),
    }
  }, [tsInput])

  function handleDateToTs() {
    const ms = parseToMs(dateInput)
    if (ms === null) {
      setError('无法解析日期时间，请使用如 2026-07-21 12:00:00 或 ISO 格式')
      return
    }
    setError('')
    setTsInput(String(Math.floor(ms / 1000)))
  }

  function handleUseNow() {
    const ms = Date.now()
    setTsInput(String(Math.floor(ms / 1000)))
    setDateInput(formatLocal(ms).slice(0, 19))
    setError('')
  }

  return (
    <ToolPage
      title="时间戳转换"
      description="Unix 时间戳与日期时间互转。自动识别秒/毫秒，全部本地计算。"
      badge="离线"
    >
      <div className="panel">
        <div className="panel-head">
          <h2>当前时间</h2>
          <div className="toolbar">
            <button type="button" className="btn btn-ghost" onClick={handleUseNow}>
              填入当前时间
            </button>
          </div>
        </div>
        <div className="grid-3">
          <div className="field">
            <label>本地时间</label>
            <input readOnly value={formatLocal(now)} />
          </div>
          <div className="field">
            <label>秒级时间戳</label>
            <div className="toolbar">
              <input readOnly value={Math.floor(now / 1000)} style={{ flex: 1 }} />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => copy(String(Math.floor(now / 1000)))}
              >
                复制
              </button>
            </div>
          </div>
          <div className="field">
            <label>毫秒时间戳</label>
            <div className="toolbar">
              <input readOnly value={now} style={{ flex: 1 }} />
              <button type="button" className="btn btn-ghost" onClick={() => copy(String(now))}>
                复制
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>时间戳 → 日期</h2>
          </div>
          <div className="field">
            <label>时间戳（秒或毫秒）</label>
            <input
              value={tsInput}
              onChange={(e) => setTsInput(e.target.value)}
              placeholder="例如 1710000000 或 1710000000000"
            />
          </div>
          {tsResult ? (
            <dl className="kv-list" style={{ marginTop: '0.85rem' }}>
              <div className="kv-item">
                <dt>秒</dt>
                <dd>{tsResult.sec}</dd>
                <button type="button" className="btn btn-ghost" onClick={() => copy(String(tsResult.sec))}>
                  复制
                </button>
              </div>
              <div className="kv-item">
                <dt>毫秒</dt>
                <dd>{tsResult.ms}</dd>
                <button type="button" className="btn btn-ghost" onClick={() => copy(String(tsResult.ms))}>
                  复制
                </button>
              </div>
              <div className="kv-item">
                <dt>本地时间</dt>
                <dd>{tsResult.local}</dd>
                <button type="button" className="btn btn-ghost" onClick={() => copy(tsResult.local)}>
                  复制
                </button>
              </div>
              <div className="kv-item">
                <dt>UTC</dt>
                <dd>{tsResult.utc}</dd>
                <button type="button" className="btn btn-ghost" onClick={() => copy(tsResult.utc)}>
                  复制
                </button>
              </div>
              <div className="kv-item">
                <dt>ISO 8601</dt>
                <dd>{tsResult.iso}</dd>
                <button type="button" className="btn btn-ghost" onClick={() => copy(tsResult.iso)}>
                  复制
                </button>
              </div>
            </dl>
          ) : (
            <p className="status-error" style={{ marginTop: '0.75rem' }}>
              请输入有效时间戳
            </p>
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>日期 → 时间戳</h2>
          </div>
          <div className="field">
            <label>日期时间</label>
            <input
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              placeholder="2026-07-21 12:00:00"
            />
          </div>
          <div className="toolbar" style={{ marginTop: '0.75rem' }}>
            <button type="button" className="btn btn-primary" onClick={handleDateToTs}>
              转换为时间戳
            </button>
          </div>
          {error ? <p className="status-error">{error}</p> : null}
          <p className="status-info" style={{ marginTop: '0.75rem' }}>
            支持本地格式、ISO 8601（如 2026-07-21T12:00:00+08:00）等 Date 可解析字符串。
          </p>
        </div>
      </div>
    </ToolPage>
  )
}
