import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ToolPage } from '../components/ToolPage'
import { Select } from '../components/Select'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import { formatColor, parseColor, toColorInputValue, type RgbaColor } from '../utils/color'
import './GradientTool.css'

type GradientType = 'linear' | 'radial'

interface Stop {
  id: string
  color: RgbaColor
  /** 0–100 */
  pos: number
}

const DEFAULT_STOPS: Stop[] = [
  { id: 's1', color: { r: 56, g: 189, b: 248, a: 1 }, pos: 0 },
  { id: 's2', color: { r: 167, g: 139, b: 250, a: 1 }, pos: 100 },
]

function uid() {
  return `s-${Math.random().toString(36).slice(2, 9)}`
}

function stopToCss(stop: Stop): string {
  const f = formatColor(stop.color)
  const color = stop.color.a < 1 ? f.rgba : f.hex
  return `${color} ${Math.round(stop.pos)}%`
}

function parseStopsFromParams(params: URLSearchParams): Stop[] | null {
  const multi = params.get('colors') || params.get('stops')
  if (multi) {
    const parts = multi.split(/[,|]/).map((s) => s.trim()).filter(Boolean)
    const stops: Stop[] = []
    parts.forEach((part, i) => {
      // 支持 #38bdf8 或 #38bdf8@40
      const [raw, posRaw] = part.split('@')
      const parsed = parseColor(raw)
      if (!parsed) return
      const pos =
        posRaw != null && posRaw !== ''
          ? Math.max(0, Math.min(100, Number(posRaw)))
          : parts.length === 1
            ? 0
            : (i / (parts.length - 1)) * 100
      stops.push({ id: uid(), color: { ...parsed, a: parsed.a ?? 1 }, pos: Number.isFinite(pos) ? pos : 0 })
    })
    if (stops.length >= 1) {
      if (stops.length === 1) {
        stops.push({ id: uid(), color: stops[0].color, pos: 100 })
      }
      return stops
    }
  }

  const c1 = params.get('c1') || params.get('color') || params.get('from')
  const c2 = params.get('c2') || params.get('to')
  if (c1 || c2) {
    const a = parseColor(c1 || '#38bdf8') ?? DEFAULT_STOPS[0].color
    const b = parseColor(c2 || '#a78bfa') ?? DEFAULT_STOPS[1].color
    return [
      { id: uid(), color: { ...a, a: a.a ?? 1 }, pos: 0 },
      { id: uid(), color: { ...b, a: b.a ?? 1 }, pos: 100 },
    ]
  }
  return null
}

/**
 * CSS 渐变可视化生成
 */
export function GradientTool() {
  const [searchParams] = useSearchParams()
  const [type, setType] = useState<GradientType>('linear')
  const [angle, setAngle] = useState(135)
  const [radialShape, setRadialShape] = useState<'circle' | 'ellipse'>('circle')
  const [radialPos, setRadialPos] = useState('center')
  const [stops, setStops] = useState<Stop[]>(DEFAULT_STOPS)
  const [importedHint, setImportedHint] = useState('')
  const { copy } = useCopyFeedback()
  const navigate = useNavigate()

  // URL 参数导入色标
  useEffect(() => {
    const fromUrl = parseStopsFromParams(searchParams)
    if (fromUrl) {
      setStops(fromUrl)
      setImportedHint(`已从链接导入 ${fromUrl.length} 个色标`)
    }
    const t = searchParams.get('type')
    if (t === 'radial' || t === 'linear') setType(t)
    const ang = searchParams.get('angle')
    if (ang != null && ang !== '' && Number.isFinite(Number(ang))) {
      setAngle(Number(ang))
    }
  }, [searchParams])

  const sorted = useMemo(
    () => [...stops].sort((a, b) => a.pos - b.pos),
    [stops],
  )

  const cssValue = useMemo(() => {
    const parts = sorted.map(stopToCss).join(', ')
    if (type === 'linear') {
      return `linear-gradient(${angle}deg, ${parts})`
    }
    return `radial-gradient(${radialShape} at ${radialPos}, ${parts})`
  }, [sorted, type, angle, radialShape, radialPos])

  const cssBlock = useMemo(
    () =>
      [
        `background: ${cssValue};`,
        `/* 兼容写法 */`,
        `background-image: ${cssValue};`,
      ].join('\n'),
    [cssValue],
  )

  function updateStop(id: string, patch: Partial<Stop>) {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    setImportedHint('')
  }

  function addStop() {
    setStops((prev) => {
      const mid = prev.length
        ? Math.round(prev.reduce((sum, s) => sum + s.pos, 0) / prev.length)
        : 50
      return [
        ...prev,
        {
          id: uid(),
          color: { r: 255, g: 255, b: 255, a: 1 },
          pos: Math.max(0, Math.min(100, mid)),
        },
      ]
    })
  }

  function removeStop(id: string) {
    setStops((prev) => (prev.length <= 2 ? prev : prev.filter((s) => s.id !== id)))
  }

  function applyHex(id: string, raw: string) {
    const parsed = parseColor(raw)
    if (!parsed) return
    updateStop(id, { color: { ...parsed, a: parsed.a ?? 1 } })
  }

  const presets: { label: string; type: GradientType; angle?: number; colors: string[] }[] = [
    { label: '青紫', type: 'linear', angle: 135, colors: ['#38bdf8', '#a78bfa'] },
    { label: '日落', type: 'linear', angle: 90, colors: ['#f97316', '#ef4444', '#a855f7'] },
    { label: '森林', type: 'linear', angle: 160, colors: ['#14532d', '#22c55e', '#bbf7d0'] },
    { label: '午夜', type: 'radial', colors: ['#38bdf8', '#0f172a'] },
    { label: '糖果', type: 'linear', angle: 45, colors: ['#f472b6', '#c084fc', '#67e8f9'] },
  ]

  function applyPreset(p: (typeof presets)[number]) {
    setType(p.type)
    if (p.angle != null) setAngle(p.angle)
    setStops(
      p.colors.map((hex, i) => {
        const c = parseColor(hex) ?? { r: 0, g: 0, b: 0, a: 1 }
        return {
          id: uid(),
          color: c,
          pos: p.colors.length === 1 ? 0 : (i / (p.colors.length - 1)) * 100,
        }
      }),
    )
    setImportedHint('')
  }

  return (
    <ToolPage
      title="渐变生成器"
      description="可视化编辑线性 / 径向渐变，导出 CSS。支持从图片取色、调色板通过链接带入色标。"
      badge="离线"
    >
      <div className="panel">
        <div className="toolbar" style={{ flexWrap: 'wrap' }}>
          {presets.map((p) => (
            <button key={p.label} type="button" className="btn btn-ghost" onClick={() => applyPreset(p)}>
              {p.label}
            </button>
          ))}
          <Link className="btn btn-ghost" to="/image-color">
            图片取色
          </Link>
          <Link className="btn btn-ghost" to="/palette">
            调色板
          </Link>
        </div>
        {importedHint ? (
          <p className="status-ok" style={{ margin: '0.55rem 0 0' }}>
            {importedHint}
          </p>
        ) : null}
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>预览</h2>
            <span className="status-info">{type === 'linear' ? '线性' : '径向'}</span>
          </div>
          <div className="grad-preview" style={{ background: cssValue }} />
          <div className="field" style={{ marginTop: '0.85rem' }}>
            <label>CSS</label>
            <textarea className="code-area" value={cssBlock} readOnly rows={4} spellCheck={false} />
          </div>
          <div className="toolbar" style={{ marginTop: '0.65rem' }}>
            <button type="button" className="btn btn-primary" onClick={() => void copy(cssValue)}>
              复制渐变值
            </button>
            <button type="button" className="btn" onClick={() => void copy(cssBlock)}>
              复制 CSS 块
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                const base = sorted[0] ? formatColor(sorted[0].color).hex : '#38bdf8'
                navigate(`/palette?color=${encodeURIComponent(base)}`)
              }}
            >
              首色 → 调色板
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>参数</h2>
          </div>
          <div className="field">
            <label>类型</label>
            <Select
              value={type}
              onChange={(v) => setType(v as GradientType)}
              aria-label="渐变类型"
              options={[
                { value: 'linear', label: '线性 linear' },
                { value: 'radial', label: '径向 radial' },
              ]}
            />
          </div>

          {type === 'linear' ? (
            <div className="field" style={{ marginTop: '0.75rem' }}>
              <label htmlFor="grad-angle">角度 {angle}°</label>
              <input
                id="grad-angle"
                type="range"
                min={0}
                max={360}
                value={angle}
                onChange={(e) => setAngle(Number(e.target.value))}
              />
              <div className="toolbar" style={{ marginTop: '0.35rem' }}>
                {[0, 45, 90, 135, 180, 270].map((a) => (
                  <button key={a} type="button" className="btn btn-ghost" onClick={() => setAngle(a)}>
                    {a}°
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="field" style={{ marginTop: '0.75rem' }}>
                <label>形状</label>
                <Select
                  value={radialShape}
                  onChange={(v) => setRadialShape(v as 'circle' | 'ellipse')}
                  aria-label="径向形状"
                  options={[
                    { value: 'circle', label: '圆形 circle' },
                    { value: 'ellipse', label: '椭圆 ellipse' },
                  ]}
                />
              </div>
              <div className="field" style={{ marginTop: '0.75rem' }}>
                <label>中心位置</label>
                <Select
                  value={radialPos}
                  onChange={setRadialPos}
                  aria-label="径向中心"
                  options={[
                    { value: 'center', label: 'center' },
                    { value: 'top', label: 'top' },
                    { value: 'bottom', label: 'bottom' },
                    { value: 'left', label: 'left' },
                    { value: 'right', label: 'right' },
                    { value: 'top left', label: 'top left' },
                    { value: 'top right', label: 'top right' },
                    { value: 'bottom left', label: 'bottom left' },
                    { value: 'bottom right', label: 'bottom right' },
                  ]}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>色标 Stops</h2>
          <button type="button" className="btn btn-primary" onClick={addStop}>
            添加色标
          </button>
        </div>
        <div className="grad-stops">
          {stops.map((stop, index) => {
            const f = formatColor(stop.color)
            return (
              <div className="grad-stop-row" key={stop.id}>
                <span className="grad-stop-index">#{index + 1}</span>
                <label className="grad-stop-picker" title={f.hex}>
                  <input
                    type="color"
                    value={toColorInputValue(stop.color)}
                    onChange={(e) => applyHex(stop.id, e.target.value)}
                    aria-label={`色标 ${index + 1} 颜色`}
                  />
                  <span style={{ background: f.css }} />
                </label>
                <input
                  className="grad-stop-hex"
                  value={f.hex}
                  onChange={(e) => applyHex(stop.id, e.target.value)}
                  spellCheck={false}
                  aria-label={`色标 ${index + 1} HEX`}
                />
                <label className="grad-stop-pos">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={stop.pos}
                    onChange={(e) => updateStop(stop.id, { pos: Number(e.target.value) })}
                  />
                  <span>{Math.round(stop.pos)}%</span>
                </label>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={stops.length <= 2}
                  onClick={() => removeStop(stop.id)}
                >
                  删除
                </button>
                <Link
                  className="btn btn-ghost"
                  to={`/palette?color=${encodeURIComponent(f.hex)}`}
                  title="以此色打开调色板"
                >
                  调色板
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </ToolPage>
  )
}
