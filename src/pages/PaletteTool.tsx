import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Select } from '../components/Select'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import {
  formatColor,
  hslToRgb,
  parseColor,
  rgbToHsl,
  toColorInputValue,
  type RgbaColor,
} from '../utils/color'
import './PaletteTool.css'

/** 配色方案类型 */
type Scheme =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'tetradic'
  | 'split'
  | 'monochrome'
  | 'shades'
  | 'tints'

const SCHEME_OPTIONS: { value: Scheme; label: string; desc: string }[] = [
  { value: 'complementary', label: '互补色', desc: '色相 +180°' },
  { value: 'analogous', label: '类似色', desc: '相邻色相' },
  { value: 'triadic', label: '三元色', desc: '间隔 120°' },
  { value: 'tetradic', label: '四元色', desc: '间隔 90°' },
  { value: 'split', label: '分裂互补', desc: '互补两侧' },
  { value: 'monochrome', label: '单色阶', desc: '同色相明度变化' },
  { value: 'shades', label: '阴影', desc: '加深（加黑）' },
  { value: 'tints', label: '浅色', desc: '减淡（加白）' },
]

function wrapHue(h: number) {
  return ((h % 360) + 360) % 360
}

/**
 * 根据基准色与方案生成调色板
 */
function buildPalette(base: RgbaColor, scheme: Scheme, count: number): RgbaColor[] {
  const hsl = rgbToHsl(base.r, base.g, base.b, base.a)
  const n = Math.max(2, Math.min(12, count))

  const fromHue = (h: number, s = hsl.s, l = hsl.l): RgbaColor =>
    hslToRgb(wrapHue(h), s, l, base.a)

  switch (scheme) {
    case 'complementary':
      return [base, fromHue(hsl.h + 180)]
    case 'analogous': {
      const step = 30
      const list: RgbaColor[] = []
      const start = -Math.floor((n - 1) / 2)
      for (let i = 0; i < n; i += 1) {
        list.push(fromHue(hsl.h + (start + i) * step))
      }
      return list
    }
    case 'triadic':
      return [base, fromHue(hsl.h + 120), fromHue(hsl.h + 240)]
    case 'tetradic':
      return [base, fromHue(hsl.h + 90), fromHue(hsl.h + 180), fromHue(hsl.h + 270)]
    case 'split':
      return [base, fromHue(hsl.h + 150), fromHue(hsl.h + 210)]
    case 'monochrome': {
      const list: RgbaColor[] = []
      for (let i = 0; i < n; i += 1) {
        const t = n === 1 ? 0.5 : i / (n - 1)
        // 明度从 12% 到 88%
        const l = 12 + t * 76
        list.push(fromHue(hsl.h, hsl.s, l))
      }
      return list
    }
    case 'shades': {
      const list: RgbaColor[] = []
      for (let i = 0; i < n; i += 1) {
        const t = n === 1 ? 0 : i / (n - 1)
        const l = hsl.l * (1 - t * 0.85)
        list.push(fromHue(hsl.h, hsl.s, l))
      }
      return list
    }
    case 'tints': {
      const list: RgbaColor[] = []
      for (let i = 0; i < n; i += 1) {
        const t = n === 1 ? 0 : i / (n - 1)
        const l = hsl.l + (100 - hsl.l) * t * 0.9
        list.push(fromHue(hsl.h, Math.max(0, hsl.s * (1 - t * 0.35)), l))
      }
      return list
    }
    default:
      return [base]
  }
}

const DEFAULT: RgbaColor = { r: 56, g: 189, b: 248, a: 1 }

/**
 * 调色板工具：基于基准色生成多种配色方案
 */
export function PaletteTool() {
  const [searchParams] = useSearchParams()
  const [base, setBase] = useState<RgbaColor>(DEFAULT)
  const [hexInput, setHexInput] = useState(() => formatColor(DEFAULT).hex)
  const [scheme, setScheme] = useState<Scheme>('analogous')
  const [count, setCount] = useState(5)
  const [error, setError] = useState('')
  const [importHint, setImportHint] = useState('')
  const { copy } = useCopyFeedback()

  const palette = useMemo(() => buildPalette(base, scheme, count), [base, scheme, count])
  const schemeMeta = SCHEME_OPTIONS.find((s) => s.value === scheme)

  /** 从 URL ?color= / ?hex= 导入基准色（图片取色 / 渐变联动） */
  useEffect(() => {
    const raw =
      searchParams.get('color') ||
      searchParams.get('hex') ||
      searchParams.get('c') ||
      searchParams.get('from')
    if (!raw) return
    const parsed = parseColor(raw)
    if (!parsed) {
      setError(`无法识别链接中的颜色：${raw}`)
      return
    }
    setBase({ ...parsed, a: 1 })
    setHexInput(formatColor(parsed).hex)
    setError('')
    setImportHint(`已从链接导入基准色 ${formatColor(parsed).hex}`)

    const schemeRaw = searchParams.get('scheme')
    if (schemeRaw && SCHEME_OPTIONS.some((s) => s.value === schemeRaw)) {
      setScheme(schemeRaw as Scheme)
    }
    const countRaw = searchParams.get('count')
    if (countRaw && Number.isFinite(Number(countRaw))) {
      setCount(Math.max(2, Math.min(12, Number(countRaw))))
    }
  }, [searchParams])

  function applyHex(raw: string) {
    const parsed = parseColor(raw)
    if (!parsed) {
      setError('请输入有效颜色，如 #38BDF8')
      return
    }
    setBase({ ...parsed, a: 1 })
    setHexInput(formatColor(parsed).hex)
    setError('')
    setImportHint('')
  }

  function handleExportCss() {
    const lines = palette.map((c, i) => `  --color-${i + 1}: ${formatColor(c).hex};`)
    copy(`:root {\n${lines.join('\n')}\n}`)
  }

  function handleExportList() {
    copy(palette.map((c) => formatColor(c).hex).join('\n'))
  }

  return (
    <ToolPage
      title="调色板"
      description="从基准色生成互补、类似、三元、四元、单色等配色方案，一键导出 CSS 变量。支持从图片取色通过链接带入。"
      badge="离线"
    >
      <div className="panel">
        {importHint ? (
          <p className="status-ok" style={{ margin: '0 0 0.65rem' }}>
            {importHint}
          </p>
        ) : null}
        <div className="toolbar" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="field" style={{ minWidth: '12rem', flex: '1 1 12rem' }}>
            <label>基准色</label>
            <div className="palette-base-row">
              <input
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value)}
                onBlur={() => applyHex(hexInput)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyHex(hexInput)
                }}
                spellCheck={false}
              />
              <label className="palette-picker">
                <input
                  type="color"
                  value={toColorInputValue(base)}
                  onChange={(e) => applyHex(e.target.value)}
                  aria-label="选择基准色"
                />
                <span style={{ background: formatColor(base).hex }} />
              </label>
            </div>
          </div>

          <div className="field" style={{ minWidth: '10rem' }}>
            <label>配色方案</label>
            <Select
              value={scheme}
              onChange={(v) => setScheme(v as Scheme)}
              aria-label="配色方案"
              options={SCHEME_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
            />
          </div>

          <div className="field" style={{ width: '7rem' }}>
            <label>数量</label>
            <input
              type="number"
              min={2}
              max={12}
              value={count}
              onChange={(e) => setCount(Math.max(2, Math.min(12, Number(e.target.value) || 2)))}
              disabled={['complementary', 'triadic', 'tetradic', 'split'].includes(scheme)}
            />
          </div>

          <div className="toolbar" style={{ alignSelf: 'flex-end' }}>
            <button type="button" className="btn btn-primary" onClick={handleExportCss}>
              复制 CSS 变量
            </button>
            <button type="button" className="btn btn-ghost" onClick={handleExportList}>
              复制 HEX 列表
            </button>
            <Link
              className="btn btn-ghost"
              to={`/gradient?colors=${encodeURIComponent(palette.map((c) => formatColor(c).hex).join(','))}`}
              title="用当前色板打开渐变生成器"
            >
              → 渐变
            </Link>
            <Link className="btn btn-ghost" to="/image-color">
              图片取色
            </Link>
          </div>
        </div>
        {schemeMeta ? (
          <p className="status-info" style={{ marginTop: '0.65rem' }}>
            {schemeMeta.label}：{schemeMeta.desc}
          </p>
        ) : null}
        {error ? <p className="status-error">{error}</p> : null}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>色板预览</h2>
          <span className="status-info">{palette.length} 色</span>
        </div>
        <div className="palette-strip">
          {palette.map((c, i) => {
            const f = formatColor(c)
            return (
              <button
                key={`${f.hex}-${i}`}
                type="button"
                className="palette-swatch"
                style={{ background: f.hex }}
                onClick={() => copy(f.hex)}
                title={`点击复制 ${f.hex}`}
              >
                <span className="palette-swatch-label">{f.hex}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>色值明细</h2>
        </div>
        <dl className="kv-list">
          {palette.map((c, i) => {
            const f = formatColor(c)
            return (
              <div className="kv-item" key={`${f.hex}-row-${i}`}>
                <dt>
                  <span className="palette-dot" style={{ background: f.hex }} />
                  色 {i + 1}
                </dt>
                <dd>
                  {f.hex} · {f.rgb} · {f.hsl}
                </dd>
                <button type="button" className="btn btn-ghost" onClick={() => copy(f.hex)}>
                  复制
                </button>
              </div>
            )
          })}
        </dl>
      </div>
    </ToolPage>
  )
}
