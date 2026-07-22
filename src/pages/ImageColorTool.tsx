import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import { formatColor, type RgbaColor } from '../utils/color'
import './ImageColorTool.css'

interface ImageMeta {
  width: number
  height: number
  fileName?: string
  sizeBytes?: number
}

interface SampledColor {
  color: RgbaColor
  x: number
  y: number
}

interface PaletteEntry {
  color: RgbaColor
  count: number
  ratio: number
}

const MAX_FILE_BYTES = 15 * 1024 * 1024
const HISTORY_LIMIT = 24

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function colorKey(c: RgbaColor, step = 16): string {
  const q = (n: number) => Math.min(255, Math.round(n / step) * step)
  return `${q(c.r)},${q(c.g)},${q(c.b)}`
}

function luminance(c: RgbaColor): number {
  return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255
}

/** 从 ImageData 抽样统计主色 */
function extractPalette(data: ImageData, maxColors = 8): PaletteEntry[] {
  const { data: px, width, height } = data
  const counts = new Map<string, { r: number; g: number; b: number; n: number }>()
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 12000)))

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4
      if (px[i + 3] < 16) continue
      const r = px[i]
      const g = px[i + 1]
      const b = px[i + 2]
      const key = colorKey({ r, g, b, a: 1 }, 24)
      const prev = counts.get(key)
      if (prev) {
        prev.r += r
        prev.g += g
        prev.b += b
        prev.n += 1
      } else {
        counts.set(key, { r, g, b, n: 1 })
      }
    }
  }

  let total = 0
  const list: PaletteEntry[] = []
  for (const item of counts.values()) {
    total += item.n
    list.push({
      color: {
        r: Math.round(item.r / item.n),
        g: Math.round(item.g / item.n),
        b: Math.round(item.b / item.n),
        a: 1,
      },
      count: item.n,
      ratio: 0,
    })
  }

  list.sort((a, b) => b.count - a.count)
  const top = list.slice(0, maxColors)
  for (const entry of top) {
    entry.ratio = total > 0 ? entry.count / total : 0
  }
  return top
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    img.src = url
  })
}

/**
 * 图片取色：点击/拖拽取色、主色提取、历史色板
 */
export function ImageColorTool() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const imageDataRef = useRef<ImageData | null>(null)

  const [meta, setMeta] = useState<ImageMeta | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [current, setCurrent] = useState<SampledColor | null>(null)
  const [history, setHistory] = useState<RgbaColor[]>([])
  const [palette, setPalette] = useState<PaletteEntry[]>([])
  const [magnifier, setMagnifier] = useState<{
    screenX: number
    screenY: number
    dataUrl: string
  } | null>(null)
  const [picking, setPicking] = useState(false)

  const { copy } = useCopyFeedback()

  const formats = useMemo(
    () => (current ? formatColor(current.color) : null),
    [current],
  )

  const drawImage = useCallback((img: HTMLImageElement, fileName?: string, sizeBytes?: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const maxSide = 1600
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))

    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      setError('无法创建画布上下文')
      return
    }
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)

    const data = ctx.getImageData(0, 0, w, h)
    imageDataRef.current = data

    setMeta({
      width: img.naturalWidth,
      height: img.naturalHeight,
      fileName,
      sizeBytes,
    })
    setPalette(extractPalette(data, 8))
    setCurrent(null)
    setMagnifier(null)
    setError('')
  }, [])

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('请选择图片文件（png / jpg / gif / webp 等）')
        return
      }
      if (file.size > MAX_FILE_BYTES) {
        setError('图片过大（上限约 15MB），请压缩后再试')
        return
      }
      try {
        const img = await loadImageFromFile(file)
        drawImage(img, file.name, file.size)
      } catch (e) {
        setError(e instanceof Error ? e.message : '读取图片失败')
        setMeta(null)
        imageDataRef.current = null
      }
    },
    [drawImage],
  )

  function sampleAtClient(clientX: number, clientY: number): SampledColor | null {
    const canvas = canvasRef.current
    const data = imageDataRef.current
    if (!canvas || !data || !meta) return null

    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null

    const x = Math.floor(((clientX - rect.left) / rect.width) * canvas.width)
    const y = Math.floor(((clientY - rect.top) / rect.height) * canvas.height)
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null

    const i = (y * canvas.width + x) * 4
    return {
      color: {
        r: data.data[i],
        g: data.data[i + 1],
        b: data.data[i + 2],
        a: Math.round((data.data[i + 3] / 255) * 1000) / 1000,
      },
      x,
      y,
    }
  }

  function updateMagnifier(clientX: number, clientY: number, sample: SampledColor) {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const zoom = 10
    const size = 11
    const half = Math.floor(size / 2)
    const off = document.createElement('canvas')
    off.width = size * zoom
    off.height = size * zoom
    const ctx = off.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    const sx = Math.max(0, Math.min(canvas.width - size, sample.x - half))
    const sy = Math.max(0, Math.min(canvas.height - size, sample.y - half))
    ctx.drawImage(canvas, sx, sy, size, size, 0, 0, size * zoom, size * zoom)

    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 1
    ctx.strokeRect(half * zoom, half * zoom, zoom, zoom)
    ctx.strokeStyle = 'rgba(15,23,42,0.85)'
    ctx.strokeRect(half * zoom + 1, half * zoom + 1, zoom - 2, zoom - 2)

    const wrapRect = wrap.getBoundingClientRect()
    setMagnifier({
      screenX: clientX - wrapRect.left + 18,
      screenY: clientY - wrapRect.top + 18,
      dataUrl: off.toDataURL(),
    })
  }

  function pushHistory(color: RgbaColor) {
    setHistory((prev) => {
      const hex = formatColor(color).hex
      const next = [color, ...prev.filter((c) => formatColor(c).hex !== hex)]
      return next.slice(0, HISTORY_LIMIT)
    })
  }

  function handlePointerSample(e: ReactPointerEvent<HTMLCanvasElement>, commit: boolean) {
    const sample = sampleAtClient(e.clientX, e.clientY)
    if (!sample) {
      setMagnifier(null)
      return
    }
    setCurrent(sample)
    updateMagnifier(e.clientX, e.clientY, sample)
    if (commit) pushHistory(sample.color)
  }

  function handleCanvasPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!meta) return
    setPicking(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    handlePointerSample(e, true)
  }

  function handleCanvasPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!meta) return
    handlePointerSample(e, picking)
  }

  function handleCanvasPointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    setPicking(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  function handleCanvasLeave() {
    if (!picking) setMagnifier(null)
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void processFile(file)
    e.target.value = ''
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void processFile(file)
  }

  function handleClear() {
    setMeta(null)
    setCurrent(null)
    setPalette([])
    setHistory([])
    setError('')
    setMagnifier(null)
    imageDataRef.current = null
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      canvas.width = 0
      canvas.height = 0
    }
  }

  function applyColor(color: RgbaColor) {
    setCurrent({ color, x: current?.x ?? 0, y: current?.y ?? 0 })
    pushHistory(color)
  }

  const crosshairStyle = useMemo(() => {
    if (!current || !meta || !canvasRef.current || !wrapRef.current) return null
    const canvas = canvasRef.current
    if (!canvas.width) return null
    const wrap = wrapRef.current
    const cRect = canvas.getBoundingClientRect()
    const wRect = wrap.getBoundingClientRect()
    if (cRect.width <= 0) return null
    const left = cRect.left - wRect.left + (current.x + 0.5) * (cRect.width / canvas.width)
    const top = cRect.top - wRect.top + (current.y + 0.5) * (cRect.height / canvas.height)
    return { left, top }
  }, [current, meta])

  return (
    <ToolPage
      title="图片取色"
      description="上传图片后点击或拖拽取色，提取主色板与历史色；可一键跳转调色板 / 渐变生成器联动。纯本地处理。"
      badge="离线"
    >
      <div className="panel">
        <div className="toolbar">
          <button type="button" className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
            选择图片
          </button>
          <button type="button" className="btn btn-danger" onClick={handleClear} disabled={!meta && !history.length}>
            清空
          </button>
          {current ? (
            <>
              <Link
                className="btn btn-primary"
                to={`/palette?color=${encodeURIComponent(formatColor(current.color).hex)}`}
              >
                当前色 → 调色板
              </Link>
              <Link
                className="btn"
                to={`/gradient?colors=${encodeURIComponent(formatColor(current.color).hex)}`}
              >
                → 渐变
              </Link>
            </>
          ) : null}
          {palette.length >= 2 ? (
            <Link
              className="btn"
              to={`/gradient?colors=${encodeURIComponent(palette.map((e) => formatColor(e.color).hex).join(','))}`}
              title="用主色打开渐变生成器"
            >
              主色 → 渐变
            </Link>
          ) : null}
          {palette[0] ? (
            <Link
              className="btn btn-ghost"
              to={`/palette?color=${encodeURIComponent(formatColor(palette[0].color).hex)}`}
              title="用占比最高主色打开调色板"
            >
              主色 → 调色板
            </Link>
          ) : null}
          <span className="status-info">
            {meta
              ? `${meta.width}×${meta.height}${meta.sizeBytes != null ? ` · ${formatBytes(meta.sizeBytes)}` : ''}${meta.fileName ? ` · ${meta.fileName}` : ''}`
              : '支持拖拽上传 · 点击画布取色'}
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleFileChange}
        />
        {error ? (
          <p className="status-error" style={{ marginTop: '0.65rem' }}>
            {error}
          </p>
        ) : null}
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>图片</h2>
            <span className="status-info">{meta ? '点击 / 拖拽取色' : '等待图片'}</span>
          </div>
          <div
            ref={wrapRef}
            className={`img-color-stage ${dragOver ? 'drag-over' : ''} ${meta ? 'has-image' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => {
              if (!meta) fileInputRef.current?.click()
            }}
          >
            {!meta ? (
              <div className="img-drop-hint">
                <strong>拖拽图片到此处</strong>
                <span>或点击选择 · png / jpg / webp / gif</span>
              </div>
            ) : null}
            <canvas
              ref={canvasRef}
              className={`img-color-canvas ${meta ? '' : 'is-empty'}`}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerLeave={handleCanvasLeave}
            />
            {crosshairStyle ? (
              <span
                className="img-color-crosshair"
                style={{ left: crosshairStyle.left, top: crosshairStyle.top }}
                aria-hidden
              />
            ) : null}
            {magnifier && meta ? (
              <div
                className="img-color-loupe"
                style={{ left: magnifier.screenX, top: magnifier.screenY }}
                aria-hidden
              >
                <img src={magnifier.dataUrl} alt="" />
              </div>
            ) : null}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>当前颜色</h2>
            {formats ? (
              <button type="button" className="btn btn-ghost" onClick={() => void copy(formats.hex)}>
                复制 HEX
              </button>
            ) : null}
          </div>
          {current && formats ? (
            <>
              <div
                className="img-color-preview"
                style={{
                  background: formats.css,
                  color: luminance(current.color) > 0.55 ? '#0f172a' : '#f8fafc',
                }}
              >
                <strong>{formats.hex}</strong>
                <span>
                  像素 ({current.x}, {current.y})
                </span>
              </div>
              <div className="toolbar" style={{ marginTop: '0.65rem' }}>
                <Link
                  className="btn btn-primary"
                  to={`/palette?color=${encodeURIComponent(formats.hex)}`}
                >
                  用此色生成调色板
                </Link>
                <Link
                  className="btn"
                  to={`/gradient?c1=${encodeURIComponent(formats.hex)}`}
                >
                  用此色做渐变
                </Link>
                <Link className="btn btn-ghost" to={`/color?color=${encodeURIComponent(formats.hex)}`}>
                  颜色转换
                </Link>
              </div>
              <dl className="kv-list" style={{ marginTop: '0.85rem' }}>
                {(
                  [
                    ['HEX', formats.hex],
                    ['RGB', formats.rgb],
                    ['RGBA', formats.rgba],
                    ['HSL', formats.hsl],
                    ['HSV', formats.hsv],
                  ] as const
                ).map(([label, value]) => (
                  <div className="kv-item" key={label}>
                    <dt>{label}</dt>
                    <dd>
                      <code>{value}</code>
                    </dd>
                    <button type="button" className="btn btn-ghost" onClick={() => void copy(value)}>
                      复制
                    </button>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="status-info" style={{ margin: 0 }}>
              在图片上点击任意位置取色
            </p>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>主色提取</h2>
          <div className="toolbar">
            <span className="status-info">量化抽样 · 最多 8 色</span>
            {palette.length > 0 ? (
              <>
                <Link
                  className="btn btn-ghost"
                  to={`/palette?color=${encodeURIComponent(formatColor(palette[0].color).hex)}`}
                >
                  主色 → 调色板
                </Link>
                <Link
                  className="btn btn-ghost"
                  to={`/gradient?colors=${encodeURIComponent(palette.map((e) => formatColor(e.color).hex).join(','))}`}
                >
                  全部 → 渐变
                </Link>
              </>
            ) : null}
          </div>
        </div>
        {palette.length === 0 ? (
          <p className="status-info" style={{ margin: 0 }}>
            上传图片后自动提取
          </p>
        ) : (
          <div className="img-color-palette">
            {palette.map((entry) => {
              const f = formatColor(entry.color)
              return (
                <div key={f.hex + entry.count} className="img-color-swatch-wrap">
                  <button
                    type="button"
                    className="img-color-swatch"
                    style={{ background: f.hex }}
                    title={`${f.hex} · ${(entry.ratio * 100).toFixed(1)}% · 点击选中`}
                    onClick={() => applyColor(entry.color)}
                  >
                    <span
                      className="img-color-swatch-label"
                      style={{ color: luminance(entry.color) > 0.55 ? '#0f172a' : '#f8fafc' }}
                    >
                      {f.hex}
                      <small>{(entry.ratio * 100).toFixed(0)}%</small>
                    </span>
                  </button>
                  <Link
                    className="img-color-swatch-link"
                    to={`/palette?color=${encodeURIComponent(f.hex)}`}
                    title="以此色打开调色板"
                  >
                    调色板
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>历史取色</h2>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setHistory([])}
            disabled={!history.length}
          >
            清空历史
          </button>
        </div>
        {history.length === 0 ? (
          <p className="status-info" style={{ margin: 0 }}>
            点击图片后颜色会累计在此
          </p>
        ) : (
          <div className="img-color-history">
            {history.map((c, i) => {
              const f = formatColor(c)
              return (
                <button
                  key={`${f.hex}-${i}`}
                  type="button"
                  className="img-color-history-dot"
                  style={{ background: f.hex }}
                  title={`${f.hex}（Alt/⌘+点击复制）`}
                  onClick={(e: MouseEvent) => {
                    if (e.altKey || e.metaKey) {
                      void copy(f.hex)
                    } else {
                      applyColor(c)
                    }
                  }}
                >
                  <span>{f.hex}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </ToolPage>
  )
}
