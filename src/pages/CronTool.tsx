import { useEffect, useMemo, useState } from 'react'
import cronstrue from 'cronstrue'
import 'cronstrue/locales/zh_CN'
import { Select } from '../components/Select'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import './CronTool.css'

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

type FieldMode = 'every' | 'step' | 'range' | 'list' | 'specific'

interface FieldConfig {
  mode: FieldMode
  /** every/step 的步长 */
  step: number
  /** range 起止 */
  rangeStart: number
  rangeEnd: number
  /** specific 单值 */
  specific: number
  /** list 多选 */
  selected: number[]
}

interface VisualState {
  minute: FieldConfig
  hour: FieldConfig
  day: FieldConfig
  month: FieldConfig
  weekday: FieldConfig
}

const DEFAULT_FIELD = (max: number): FieldConfig => ({
  mode: 'every',
  step: 1,
  rangeStart: 0,
  rangeEnd: Math.min(max, 1),
  specific: 0,
  selected: [],
})

function defaultVisual(): VisualState {
  return {
    minute: { ...DEFAULT_FIELD(59), mode: 'step', step: 5, rangeStart: 0, rangeEnd: 59 },
    hour: DEFAULT_FIELD(23),
    day: { ...DEFAULT_FIELD(31), rangeStart: 1, rangeEnd: 31, specific: 1 },
    month: { ...DEFAULT_FIELD(12), rangeStart: 1, rangeEnd: 12, specific: 1 },
    weekday: DEFAULT_FIELD(6),
  }
}

const FIELD_META: {
  key: keyof VisualState
  label: string
  min: number
  max: number
  labels?: string[]
}[] = [
  { key: 'minute', label: '分', min: 0, max: 59 },
  { key: 'hour', label: '时', min: 0, max: 23 },
  { key: 'day', label: '日', min: 1, max: 31 },
  {
    key: 'month',
    label: '月',
    min: 1,
    max: 12,
    labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  },
  {
    key: 'weekday',
    label: '周',
    min: 0,
    max: 6,
    labels: ['日', '一', '二', '三', '四', '五', '六'],
  },
]

function fieldToCron(cfg: FieldConfig, min: number, max: number): string {
  switch (cfg.mode) {
    case 'every':
      return '*'
    case 'step': {
      const step = Math.max(1, Math.min(max, cfg.step || 1))
      return step === 1 ? '*' : `*/${step}`
    }
    case 'range': {
      const a = Math.min(Math.max(cfg.rangeStart, min), max)
      const b = Math.min(Math.max(cfg.rangeEnd, min), max)
      return a <= b ? `${a}-${b}` : `${b}-${a}`
    }
    case 'specific':
      return String(Math.min(Math.max(cfg.specific, min), max))
    case 'list': {
      const vals = [...new Set(cfg.selected)]
        .filter((n) => n >= min && n <= max)
        .sort((x, y) => x - y)
      return vals.length ? vals.join(',') : '*'
    }
    default:
      return '*'
  }
}

function visualToExpr(v: VisualState): string {
  return [
    fieldToCron(v.minute, 0, 59),
    fieldToCron(v.hour, 0, 23),
    fieldToCron(v.day, 1, 31),
    fieldToCron(v.month, 1, 12),
    fieldToCron(v.weekday, 0, 6),
  ].join(' ')
}

/** 尝试把单段 cron 解析回可视化配置（覆盖常见写法） */
function parseFieldToken(token: string, min: number, max: number): FieldConfig | null {
  const t = token.trim()
  if (t === '*') return { ...DEFAULT_FIELD(max), mode: 'every', rangeStart: min, rangeEnd: max, specific: min }

  const stepEvery = /^\*\/(\d+)$/.exec(t)
  if (stepEvery) {
    return {
      ...DEFAULT_FIELD(max),
      mode: 'step',
      step: Number(stepEvery[1]),
      rangeStart: min,
      rangeEnd: max,
      specific: min,
    }
  }

  const range = /^(\d+)-(\d+)$/.exec(t)
  if (range) {
    return {
      ...DEFAULT_FIELD(max),
      mode: 'range',
      rangeStart: Number(range[1]),
      rangeEnd: Number(range[2]),
      specific: min,
    }
  }

  if (/^\d+$/.test(t)) {
    return {
      ...DEFAULT_FIELD(max),
      mode: 'specific',
      specific: Number(t),
      rangeStart: min,
      rangeEnd: max,
    }
  }

  if (/^[\d,]+$/.test(t) && t.includes(',')) {
    const selected = t
      .split(',')
      .map(Number)
      .filter((n) => !Number.isNaN(n) && n >= min && n <= max)
    return {
      ...DEFAULT_FIELD(max),
      mode: 'list',
      selected,
      rangeStart: min,
      rangeEnd: max,
      specific: min,
    }
  }

  return null
}

function tryParseVisual(expr: string): VisualState | null {
  const parts = expr.trim().split(/\s+/).filter(Boolean)
  if (parts.length !== 5) return null
  const bounds: [number, number][] = [
    [0, 59],
    [0, 23],
    [1, 31],
    [1, 12],
    [0, 6],
  ]
  const keys: (keyof VisualState)[] = ['minute', 'hour', 'day', 'month', 'weekday']
  const next = defaultVisual()
  for (let i = 0; i < 5; i += 1) {
    // 周字段 7 视作 0
    let token = parts[i]
    if (keys[i] === 'weekday') {
      token = token.replace(/\b7\b/g, '0')
    }
    const parsed = parseFieldToken(token, bounds[i][0], bounds[i][1])
    if (!parsed) return null
    next[keys[i]] = parsed
  }
  return next
}

/**
 * 解析 5/6 段 cron 为字段说明
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
 * 简易下次触发估算（标准 5 段）
 */
function nextRuns(expr: string, count = 5, from = new Date()): Date[] {
  const parts = expr.trim().split(/\s+/).filter(Boolean)
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
  const dows = parseField(dowF, 0, 7)
  if (!minutes || !hours || !doms || !months || !dows) return []
  if (dows.has(7)) dows.add(0)

  const results: Date[] = []
  const cursor = new Date(from)
  cursor.setSeconds(0, 0)
  cursor.setMinutes(cursor.getMinutes() + 1)

  const limit = 366 * 24 * 60
  for (let i = 0; i < limit && results.length < count; i += 1) {
    const m = cursor.getMonth() + 1
    const d = cursor.getDate()
    const h = cursor.getHours()
    const mi = cursor.getMinutes()
    const dow = cursor.getDay()
    const domStar = domF === '*' || domF.startsWith('*/')
    const dowStar = dowF === '*' || dowF.startsWith('*/')

    const monthOk = months.has(m)
    const minOk = minutes.has(mi)
    const hourOk = hours.has(h)
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

const MODE_OPTIONS: { value: FieldMode; label: string }[] = [
  { value: 'every', label: '每（*）' },
  { value: 'step', label: '间隔（*/n）' },
  { value: 'range', label: '范围（a-b）' },
  { value: 'specific', label: '指定值' },
  { value: 'list', label: '多选列表' },
]

/**
 * Cron 解析 + 可视化编辑
 */
export function CronTool() {
  const [expr, setExpr] = useState('*/5 * * * *')
  const [visual, setVisual] = useState<VisualState>(() => tryParseVisual('*/5 * * * *') ?? defaultVisual())
  const [syncFromExpr, setSyncFromExpr] = useState(false)
  const { copy } = useCopyFeedback()

  // 可视化 → 表达式
  useEffect(() => {
    if (syncFromExpr) return
    const next = visualToExpr(visual)
    setExpr((prev) => (prev === next ? prev : next))
  }, [visual, syncFromExpr])

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

  function applyExpr(next: string, fromPreset = false) {
    setExpr(next)
    const parsed = tryParseVisual(next)
    if (parsed) {
      setSyncFromExpr(true)
      setVisual(parsed)
      // 下一帧恢复可视化驱动，避免循环
      queueMicrotask(() => setSyncFromExpr(false))
    } else if (fromPreset) {
      setSyncFromExpr(false)
    }
  }

  function updateField(key: keyof VisualState, patch: Partial<FieldConfig>) {
    setSyncFromExpr(false)
    setVisual((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }))
  }

  function toggleListValue(key: keyof VisualState, value: number) {
    setSyncFromExpr(false)
    setVisual((prev) => {
      const selected = prev[key].selected.includes(value)
        ? prev[key].selected.filter((n) => n !== value)
        : [...prev[key].selected, value]
      return {
        ...prev,
        [key]: { ...prev[key], mode: 'list', selected },
      }
    })
  }

  return (
    <ToolPage
      title="Cron 解析 / 编辑"
      description="可视化点选生成 Cron，或粘贴表达式查看中文说明与下次触发。纯本地处理。"
      badge="离线"
    >
      <div className="panel">
        <div className="toolbar">
          {PRESETS.map((p) => (
            <button
              key={p.expr + p.label}
              type="button"
              className="btn btn-ghost"
              onClick={() => applyExpr(p.expr, true)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>可视化编辑</h2>
          <span className="status-info">生成标准 5 段（分 时 日 月 周）</span>
        </div>
        <div className="cron-visual">
          {FIELD_META.map((meta) => {
            const cfg = visual[meta.key]
            const values = Array.from({ length: meta.max - meta.min + 1 }, (_, i) => meta.min + i)
            return (
              <div className="cron-field-card" key={meta.key}>
                <div className="cron-field-head">
                  <strong>{meta.label}</strong>
                  <code>{fieldToCron(cfg, meta.min, meta.max)}</code>
                </div>
                <Select
                  value={cfg.mode}
                  onChange={(v) => updateField(meta.key, { mode: v as FieldMode })}
                  aria-label={`${meta.label}模式`}
                  options={MODE_OPTIONS}
                />

                {cfg.mode === 'step' ? (
                  <div className="cron-inline-fields">
                    <label>
                      每隔
                      <input
                        type="number"
                        min={1}
                        max={meta.max}
                        value={cfg.step}
                        onChange={(e) => updateField(meta.key, { step: Number(e.target.value) || 1 })}
                      />
                    </label>
                  </div>
                ) : null}

                {cfg.mode === 'range' ? (
                  <div className="cron-inline-fields">
                    <label>
                      从
                      <input
                        type="number"
                        min={meta.min}
                        max={meta.max}
                        value={cfg.rangeStart}
                        onChange={(e) => updateField(meta.key, { rangeStart: Number(e.target.value) })}
                      />
                    </label>
                    <label>
                      到
                      <input
                        type="number"
                        min={meta.min}
                        max={meta.max}
                        value={cfg.rangeEnd}
                        onChange={(e) => updateField(meta.key, { rangeEnd: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                ) : null}

                {cfg.mode === 'specific' ? (
                  <div className="cron-inline-fields">
                    <label>
                      值
                      <input
                        type="number"
                        min={meta.min}
                        max={meta.max}
                        value={cfg.specific}
                        onChange={(e) => updateField(meta.key, { specific: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                ) : null}

                {cfg.mode === 'list' ? (
                  <div className="cron-chip-grid">
                    {values.map((n) => {
                      const label = meta.labels?.[n - meta.min] ?? String(n)
                      const active = cfg.selected.includes(n)
                      return (
                        <button
                          key={n}
                          type="button"
                          className={`cron-chip ${active ? 'active' : ''}`}
                          onClick={() => toggleListValue(meta.key, n)}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                ) : null}

                {cfg.mode === 'every' ? (
                  <p className="status-info" style={{ margin: '0.5rem 0 0', fontSize: '0.8rem' }}>
                    匹配全部 {meta.label}（*）
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <div className="panel">
        <div className="field">
          <label htmlFor="cron-expr">Cron 表达式</label>
          <input
            id="cron-expr"
            value={expr}
            onChange={(e) => applyExpr(e.target.value)}
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
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              const parsed = tryParseVisual(expr)
              if (parsed) {
                setSyncFromExpr(true)
                setVisual(parsed)
                queueMicrotask(() => setSyncFromExpr(false))
              }
            }}
            title="仅当表达式为可识别的 5 段写法时可同步"
          >
            表达式 → 可视化
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
