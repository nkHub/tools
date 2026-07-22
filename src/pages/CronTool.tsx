import { useMemo, useState } from 'react'
import cronstrue from 'cronstrue'
import 'cronstrue/locales/zh_CN'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'

/** 常见示例 */
const PRESETS: { label: string; expr: string }[] = [
  { label: '每分钟', expr: '* * * * *' },
  { label: '每 5 分钟', expr: '*/5 * * * *' },
  { label: '每小时', expr: '0 * * * *' },
  { label: '每天 0 点', expr: '0 0 * * *' },
  { label: '工作日 9 点', expr: '0 9 * * 1-5' },
  { label: '每周一 8:30', expr: '30 8 * * 1' },
  { label: '每月 1 号', expr: '0 0 1 * *' },
  { label: '带秒：每 10 秒', expr: '*/10 * * * * *' },
]

/**
 * 解析 5/6 段 cron 为字段说明（不依赖库，仅展示用）
 */
function splitFields(expr: string): { name: string; value: string }[] {
  const parts = expr.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 5) {
    return [
      { name: '分', value: parts[0] },
      { name: '时', value: parts[1] },
      { name: '日', value: parts[2] },
      { name: '月', value: parts[3] },
      { name: '周', value: parts[4] },
    ]
  }
  if (parts.length === 6) {
    return [
      { name: '秒', value: parts[0] },
      { name: '分', value: parts[1] },
      { name: '时', value: parts[2] },
      { name: '日', value: parts[3] },
      { name: '月', value: parts[4] },
      { name: '周', value: parts[5] },
    ]
  }
  if (parts.length === 7) {
    return [
      { name: '秒', value: parts[0] },
      { name: '分', value: parts[1] },
      { name: '时', value: parts[2] },
      { name: '日', value: parts[3] },
      { name: '月', value: parts[4] },
      { name: '周', value: parts[5] },
      { name: '年', value: parts[6] },
    ]
  }
  return parts.map((v, i) => ({ name: `段${i + 1}`, value: v }))
}

/**
 * 简易下次触发估算（标准 5 段：分 时 日 月 周）
 * 仅覆盖常见 * / - , 语法，失败返回空数组
 */
function nextRuns(expr: string, count = 5, from = new Date()): Date[] {
  const parts = expr.trim().split(/\s+/).filter(Boolean)
  // 只处理 5 段（分 时 日 月 周）
  if (parts.length !== 5) return []

  const [minF, hourF, domF, monF, dowF] = parts

  function parseField(field: string, min: number, max: number): Set<number> | null {
    const set = new Set<number>()
    for (const token of field.split(',')) {
      const stepMatch = /^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/.exec(token)
      if (!stepMatch) return null
      const range = stepMatch[1]
      const step = stepMatch[2] ? Number(stepMatch[2]) : 1
      if (!step || step < 1) return null
      let start = min
      let end = max
      if (range !== '*') {
        if (range.includes('-')) {
          const [a, b] = range.split('-').map(Number)
          if (Number.isNaN(a) || Number.isNaN(b)) return null
          start = a
          end = b
        } else {
          const n = Number(range)
          if (Number.isNaN(n)) return null
          start = n
          end = n
        }
      }
      for (let i = start; i <= end; i += step) {
        if (i >= min && i <= max) set.add(i)
      }
    }
    return set
  }

  const minutes = parseField(minF, 0, 59)
  const hours = parseField(hourF, 0, 23)
  const doms = parseField(domF, 1, 31)
  const months = parseField(monF, 1, 12)
  // cron 周：0/7=周日 … 6=周六；简化映射
  const dows = parseField(dowF, 0, 7)
  if (!minutes || !hours || !doms || !months || !dows) return []

  // 扩展 7→0
  if (dows.has(7)) dows.add(0)

  const results: Date[] = []
  // 从下一分钟开始扫，最多扫约 2 年的分钟（保护上限）
  const cursor = new Date(from)
  cursor.setSeconds(0, 0)
  cursor.setMinutes(cursor.getMinutes() + 1)

  const limit = 366 * 24 * 60
  for (let i = 0; i < limit && results.length < count; i += 1) {
    const m = cursor.getMonth() + 1
    const d = cursor.getDate()
    const h = cursor.getHours()
    const mi = cursor.getMinutes()
    const dow = cursor.getDay() // 0=周日
    const domStar = domF === '*' || domF.startsWith('*/')
    const dowStar = dowF === '*' || dowF.startsWith('*/')

    const monthOk = months.has(m)
    const minOk = minutes.has(mi)
    const hourOk = hours.has(h)
    // 日与周：两者都非 * 时，OR 语义（常见 cron）
    let dayOk = true
    if (!domStar && !dowStar) {
      dayOk = doms.has(d) || dows.has(dow)
    } else {
      dayOk = (domStar || doms.has(d)) && (dowStar || dows.has(dow))
    }

    if (monthOk && minOk && hourOk && dayOk) {
      results.push(new Date(cursor))
    }
    cursor.setMinutes(cursor.getMinutes() + 1)
  }
  return results
}

/**
 * Cron 表达式解析工具
 */
export function CronTool() {
  const [expr, setExpr] = useState('*/5 * * * *')
  const { copy } = useCopyFeedback()

  const description = useMemo(() => {
    const raw = expr.trim()
    if (!raw) return { ok: false as const, text: '请输入 Cron 表达式' }
    try {
      const text = cronstrue.toString(raw, {
        locale: 'zh_CN',
        use24HourTimeFormat: true,
        throwExceptionOnParseError: true,
      })
      return { ok: true as const, text }
    } catch (e) {
      return { ok: false as const, text: e instanceof Error ? e.message : '解析失败' }
    }
  }, [expr])

  const fields = useMemo(() => (expr.trim() ? splitFields(expr) : []), [expr])
  const runs = useMemo(
    () => (description.ok ? nextRuns(expr.trim(), 8) : []),
    [expr, description.ok],
  )

  return (
    <ToolPage
      title="Cron 解析"
      description="将 Cron 表达式转为中文说明，展示各字段含义与（5 段标准）接下来几次触发时间。纯本地处理。"
      badge="离线"
    >
      <div className="panel">
        <div className="toolbar">
          {PRESETS.map((p) => (
            <button key={p.expr + p.label} type="button" className="btn btn-ghost" onClick={() => setExpr(p.expr)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="field">
          <label htmlFor="cron-expr">Cron 表达式</label>
          <input
            id="cron-expr"
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            placeholder="如 */5 * * * * 或 0 9 * * 1-5"
            spellCheck={false}
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
          />
        </div>
        <div className="toolbar" style={{ marginTop: '0.75rem' }}>
          <button type="button" className="btn" onClick={() => void copy(expr)} disabled={!expr.trim()}>
            复制表达式
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => description.ok && void copy(description.text)}
            disabled={!description.ok}
          >
            复制说明
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>人类可读</h2>
        </div>
        <p className={description.ok ? 'status-ok' : 'status-error'} style={{ margin: 0, fontSize: '1.05rem' }}>
          {description.text}
        </p>
      </div>

      {fields.length > 0 ? (
        <div className="panel">
          <div className="panel-head">
            <h2>字段拆解</h2>
            <span className="status-info">{fields.length} 段</span>
          </div>
          <dl className="kv-list">
            {fields.map((f) => (
              <div className="kv-item" key={f.name}>
                <dt>{f.name}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <div className="panel">
        <div className="panel-head">
          <h2>接下来几次触发</h2>
          <span className="status-info">仅标准 5 段（分 时 日 月 周）</span>
        </div>
        {runs.length === 0 ? (
          <p className="status-info" style={{ margin: 0 }}>
            无法估算：请使用 5 段标准 Cron，或语法含当前简易解析器未支持的符号。
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.8 }}>
            {runs.map((d) => (
              <li key={d.getTime()}>
                <code style={{ fontSize: '0.9rem' }}>
                  {d.toLocaleString('zh-CN', { hour12: false })}
                </code>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ToolPage>
  )
}
