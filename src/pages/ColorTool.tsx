import { useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import {
  formatColor,
  hslToRgb,
  hsvToRgb,
  parseColor,
  rgbToHsl,
  rgbToHsv,
  toColorInputValue,
  type RgbaColor,
} from '../utils/color'
import './ColorTool.css'

/** 格式行配置：标签 + 取值键 */
const FORMAT_ROWS: { key: keyof ReturnType<typeof formatColor>; label: string; hint: string }[] = [
  { key: 'hex', label: 'HEX', hint: '#RRGGBB' },
  { key: 'hexAlpha', label: 'HEXA', hint: '#RRGGBBAA' },
  { key: 'rgb', label: 'RGB', hint: 'rgb(r, g, b)' },
  { key: 'rgba', label: 'RGBA', hint: 'rgba(r, g, b, a)' },
  { key: 'hsl', label: 'HSL', hint: 'hsl(h, s%, l%)' },
  { key: 'hsla', label: 'HSLA', hint: 'hsla(h, s%, l%, a)' },
  { key: 'hsv', label: 'HSV', hint: 'hsv(h, s%, v%)' },
  { key: 'css', label: 'CSS', hint: '推荐用于样式' },
]

/** 默认颜色：天蓝色 */
const DEFAULT: RgbaColor = { r: 56, g: 189, b: 248, a: 1 }

/**
 * 颜色代码转换工具
 * - 任意格式输入自动解析
 * - 色板 / 滑块联动
 * - 一键复制 HEX / RGB / HSL / HSV 等
 */
export function ColorTool() {
  const [color, setColor] = useState<RgbaColor>(DEFAULT)
  const [input, setInput] = useState(() => formatColor(DEFAULT).hex)
  const [error, setError] = useState('')
  const { copy } = useCopyFeedback()

  const formats = useMemo(() => formatColor(color), [color])
  const hsl = useMemo(() => rgbToHsl(color.r, color.g, color.b, color.a), [color])
  const hsv = useMemo(() => rgbToHsv(color.r, color.g, color.b, color.a), [color])

  /** 应用解析结果并同步输入框为规范 HEX */
  function applyColor(next: RgbaColor, syncInput = true) {
    setColor(next)
    setError('')
    if (syncInput) {
      setInput(formatColor(next).hex)
    }
  }

  /** 自由文本解析 */
  function handleParse() {
    const parsed = parseColor(input)
    if (!parsed) {
      setError('无法识别颜色，请使用如 #38BDF8、rgb(56,189,248)、hsl(199,93%,60%) 等格式')
      return
    }
    applyColor(parsed, true)
  }

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleParse()
    }
  }

  /** 原生 color picker（无 alpha） */
  function handlePicker(e: ChangeEvent<HTMLInputElement>) {
    const parsed = parseColor(e.target.value)
    if (parsed) {
      applyColor({ ...parsed, a: color.a }, true)
    }
  }

  function updateRgb(channel: 'r' | 'g' | 'b', value: number) {
    applyColor({ ...color, [channel]: Math.round(value) }, true)
  }

  function updateAlpha(value: number) {
    applyColor({ ...color, a: value }, true)
  }

  function updateHsl(part: 'h' | 's' | 'l', value: number) {
    const next = hslToRgb(
      part === 'h' ? value : hsl.h,
      part === 's' ? value : hsl.s,
      part === 'l' ? value : hsl.l,
      color.a,
    )
    applyColor(next, true)
  }

  function updateHsv(part: 'h' | 's' | 'v', value: number) {
    const next = hsvToRgb(
      part === 'h' ? value : hsv.h,
      part === 's' ? value : hsv.s,
      part === 'v' ? value : hsv.v,
      color.a,
    )
    applyColor(next, true)
  }

  const previewStyle = {
    backgroundColor: formats.rgba,
  }

  return (
    <ToolPage
      title="颜色代码转换"
      description="HEX / RGB / HSL / HSV 互转，支持 alpha。输入任意格式或使用色板，一键复制各格式代码。"
      badge="离线"
    >
      <div className="panel">
        <div className="toolbar color-input-bar">
          <div className="field color-input-field">
            <label htmlFor="color-raw">颜色输入</label>
            <div className="color-input-row">
              <input
                id="color-raw"
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  setError('')
                }}
                onKeyDown={handleInputKeyDown}
                placeholder="#38BDF8 / rgb() / hsl() / hsv()"
                spellCheck={false}
              />
              <label className="color-swatch-btn" title="选择颜色">
                <input
                  type="color"
                  value={toColorInputValue(color)}
                  onChange={handlePicker}
                  aria-label="颜色选择器"
                />
                <span style={previewStyle} />
              </label>
              <button type="button" className="btn btn-primary" onClick={handleParse}>
                转换
              </button>
            </div>
          </div>
        </div>
        {error ? <p className="status-error" style={{ marginTop: '0.65rem' }}>{error}</p> : null}
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>预览</h2>
            <span className="status-info">{formats.hex}</span>
          </div>
          <div className="color-preview-stage">
            <div className="color-preview-checker">
              <div className="color-preview-fill" style={previewStyle} />
            </div>
            <div className="color-preview-meta">
              <span>R {color.r}</span>
              <span>G {color.g}</span>
              <span>B {color.b}</span>
              <span>A {Math.round(color.a * 100)}%</span>
            </div>
          </div>

          <div className="color-sliders">
            <label className="color-slider">
              <span>R</span>
              <input
                type="range"
                min={0}
                max={255}
                value={color.r}
                onChange={(e) => updateRgb('r', Number(e.target.value))}
              />
              <input
                type="number"
                min={0}
                max={255}
                value={color.r}
                onChange={(e) => updateRgb('r', Number(e.target.value))}
              />
            </label>
            <label className="color-slider">
              <span>G</span>
              <input
                type="range"
                min={0}
                max={255}
                value={color.g}
                onChange={(e) => updateRgb('g', Number(e.target.value))}
              />
              <input
                type="number"
                min={0}
                max={255}
                value={color.g}
                onChange={(e) => updateRgb('g', Number(e.target.value))}
              />
            </label>
            <label className="color-slider">
              <span>B</span>
              <input
                type="range"
                min={0}
                max={255}
                value={color.b}
                onChange={(e) => updateRgb('b', Number(e.target.value))}
              />
              <input
                type="number"
                min={0}
                max={255}
                value={color.b}
                onChange={(e) => updateRgb('b', Number(e.target.value))}
              />
            </label>
            <label className="color-slider">
              <span>A</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(color.a * 100)}
                onChange={(e) => updateAlpha(Number(e.target.value) / 100)}
              />
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(color.a * 100)}
                onChange={(e) => updateAlpha(Number(e.target.value) / 100)}
              />
            </label>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>HSL / HSV 调节</h2>
          </div>
          <div className="color-sliders">
            <label className="color-slider">
              <span>H</span>
              <input
                type="range"
                min={0}
                max={360}
                value={Math.round(hsl.h)}
                onChange={(e) => updateHsl('h', Number(e.target.value))}
                className="hue-range"
              />
              <input
                type="number"
                min={0}
                max={360}
                value={Math.round(hsl.h)}
                onChange={(e) => updateHsl('h', Number(e.target.value))}
              />
            </label>
            <label className="color-slider">
              <span>S</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(hsl.s)}
                onChange={(e) => updateHsl('s', Number(e.target.value))}
              />
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(hsl.s)}
                onChange={(e) => updateHsl('s', Number(e.target.value))}
              />
            </label>
            <label className="color-slider">
              <span>L</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(hsl.l)}
                onChange={(e) => updateHsl('l', Number(e.target.value))}
              />
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(hsl.l)}
                onChange={(e) => updateHsl('l', Number(e.target.value))}
              />
            </label>
            <label className="color-slider">
              <span>V</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(hsv.v)}
                onChange={(e) => updateHsv('v', Number(e.target.value))}
              />
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(hsv.v)}
                onChange={(e) => updateHsv('v', Number(e.target.value))}
              />
            </label>
          </div>
          <p className="color-hint">H/S/L 对应 HSL；V 为 HSV 明度，调节时会同步 RGB。</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>格式输出</h2>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => copy(FORMAT_ROWS.map((r) => `${r.label}: ${formats[r.key]}`).join('\n'))}
          >
            复制全部
          </button>
        </div>
        <dl className="kv-list">
          {FORMAT_ROWS.map((row) => (
            <div className="kv-item" key={row.key}>
              <dt>
                {row.label}
                <small className="color-format-hint">{row.hint}</small>
              </dt>
              <dd>{formats[row.key]}</dd>
              <button type="button" className="btn btn-ghost" onClick={() => copy(formats[row.key])}>
                复制
              </button>
            </div>
          ))}
        </dl>
      </div>
    </ToolPage>
  )
}
