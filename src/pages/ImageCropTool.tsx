import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Select } from '../components/Select'
import { ToolPage } from '../components/ToolPage'
import './ImageCropTool.css'

type OutFormat = 'image/png' | 'image/jpeg' | 'image/webp'
type AspectMode = 'free' | '1:1' | '4:3' | '16:9' | '3:2' | '9:16'

interface SourceMeta {
  url: string
  width: number
  height: number
  name: string
}

/** 裁剪框：相对原图像素坐标 */
interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | null

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function aspectRatio(mode: AspectMode): number | null {
  switch (mode) {
    case '1:1':
      return 1
    case '4:3':
      return 4 / 3
    case '16:9':
      return 16 / 9
    case '3:2':
      return 3 / 2
    case '9:16':
      return 9 / 16
    default:
      return null
  }
}

function clampCrop(rect: CropRect, imgW: number, imgH: number): CropRect {
  let { x, y, w, h } = rect
  w = Math.max(8, Math.min(w, imgW))
  h = Math.max(8, Math.min(h, imgH))
  x = Math.max(0, Math.min(x, imgW - w))
  y = Math.max(0, Math.min(y, imgH - h))
  return { x, y, w, h }
}

function fitAspect(rect: CropRect, ratio: number, imgW: number, imgH: number): CropRect {
  let { x, y, w, h } = rect
  // 以宽度为主调整高度
  h = w / ratio
  if (h > imgH) {
    h = imgH
    w = h * ratio
  }
  if (w > imgW) {
    w = imgW
    h = w / ratio
  }
  x = Math.max(0, Math.min(x, imgW - w))
  y = Math.max(0, Math.min(y, imgH - h))
  return clampCrop({ x, y, w, h }, imgW, imgH)
}

/**
 * 图片裁剪 + 圆角蒙版导出
 */
export function ImageCropTool() {
  const [source, setSource] = useState<SourceMeta | null>(null)
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 100, h: 100 })
  const [aspect, setAspect] = useState<AspectMode>('free')
  const [radius, setRadius] = useState(0)
  const [circle, setCircle] = useState(false)
  const [format, setFormat] = useState<OutFormat>('image/png')
  const [quality, setQuality] = useState(0.92)
  const [resultUrl, setResultUrl] = useState('')
  const [resultSize, setResultSize] = useState(0)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [displayScale, setDisplayScale] = useState(1)

  const fileRef = useRef<HTMLInputElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const dragMode = useRef<DragMode>(null)
  const dragStart = useRef({ px: 0, py: 0, crop: { x: 0, y: 0, w: 0, h: 0 } })

  const maxRadius = useMemo(() => Math.floor(Math.min(crop.w, crop.h) / 2), [crop.w, crop.h])
  const effectiveRadius = circle ? maxRadius : Math.min(radius, maxRadius)

  useEffect(() => {
    return () => {
      setSource((prev) => {
        if (prev) URL.revokeObjectURL(prev.url)
        return null
      })
      setResultUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return ''
      })
    }
  }, [])

  const updateDisplayScale = useCallback(() => {
    const el = imgRef.current
    if (!el || !source) return
    const rect = el.getBoundingClientRect()
    if (rect.width > 0) setDisplayScale(rect.width / source.width)
  }, [source])

  useEffect(() => {
    updateDisplayScale()
    window.addEventListener('resize', updateDisplayScale)
    return () => window.removeEventListener('resize', updateDisplayScale)
  }, [updateDisplayScale, source])

  const loadFile = useCallback(async (file: File) => {
    try {
      if (!file.type.startsWith('image/')) throw new Error('请选择图片文件')
      const url = URL.createObjectURL(file)
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('图片加载失败'))
        img.src = url
      })
      const w = img.naturalWidth
      const h = img.naturalHeight
      setSource((prev) => {
        if (prev) URL.revokeObjectURL(prev.url)
        return { url, width: w, height: h, name: file.name }
      })
      const side = Math.min(w, h)
      const initial: CropRect = {
        x: Math.floor((w - side) / 2),
        y: Math.floor((h - side) / 2),
        w: side,
        h: side,
      }
      setCrop(initial)
      setRadius(0)
      setCircle(false)
      setResultUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return ''
      })
      setResultSize(0)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '读取失败')
    }
  }, [])

  function applyAspect(mode: AspectMode) {
    setAspect(mode)
    if (!source) return
    const ratio = aspectRatio(mode)
    if (ratio == null) return
    setCrop((prev) => fitAspect(prev, ratio, source.width, source.height))
  }

  function onPointerDown(mode: DragMode, e: ReactPointerEvent) {
    if (!source) return
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    dragMode.current = mode
    dragStart.current = { px: e.clientX, py: e.clientY, crop: { ...crop } }
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!dragMode.current || !source) return
    const scale = displayScale || 1
    const dx = (e.clientX - dragStart.current.px) / scale
    const dy = (e.clientY - dragStart.current.py) / scale
    const start = dragStart.current.crop
    const ratio = aspectRatio(aspect)
    let next: CropRect = { ...start }

    if (dragMode.current === 'move') {
      next = { ...start, x: start.x + dx, y: start.y + dy }
    } else {
      const minSize = 8
      if (dragMode.current.includes('e')) {
        next.w = Math.max(minSize, start.w + dx)
      }
      if (dragMode.current.includes('s')) {
        next.h = Math.max(minSize, start.h + dy)
      }
      if (dragMode.current.includes('w')) {
        const nw = Math.max(minSize, start.w - dx)
        next.x = start.x + (start.w - nw)
        next.w = nw
      }
      if (dragMode.current.includes('n')) {
        const nh = Math.max(minSize, start.h - dy)
        next.y = start.y + (start.h - nh)
        next.h = nh
      }
      if (ratio != null) {
        // 锁定比例：以变化更大的边为准
        if (Math.abs(dx) >= Math.abs(dy)) {
          next.h = next.w / ratio
          if (dragMode.current.includes('n')) {
            next.y = start.y + start.h - next.h
          }
        } else {
          next.w = next.h * ratio
          if (dragMode.current.includes('w')) {
            next.x = start.x + start.w - next.w
          }
        }
      }
    }

    setCrop(clampCrop(next, source.width, source.height))
  }

  function onPointerUp() {
    dragMode.current = null
  }

  async function handleExport() {
    if (!source) {
      setError('请先选择图片')
      return
    }
    try {
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('源图加载失败'))
        img.src = source.url
      })
      const { x, y, w, h } = clampCrop(crop, source.width, source.height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(w)
      canvas.height = Math.round(h)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 不可用')

      const r = Math.min(effectiveRadius, Math.floor(Math.min(w, h) / 2))
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      ctx.save()
      if (r > 0) {
        const rr = r
        const cw = canvas.width
        const ch = canvas.height
        ctx.beginPath()
        ctx.moveTo(rr, 0)
        ctx.arcTo(cw, 0, cw, ch, rr)
        ctx.arcTo(cw, ch, 0, ch, rr)
        ctx.arcTo(0, ch, 0, 0, rr)
        ctx.arcTo(0, 0, cw, 0, rr)
        ctx.closePath()
        ctx.clip()
      }
      ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height)
      ctx.restore()

      const q = format === 'image/png' ? undefined : quality
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, format, q),
      )
      if (!blob) throw new Error('导出失败')
      const url = URL.createObjectURL(blob)
      setResultUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      setResultSize(blob.size)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '导出失败')
    }
  }

  function handleDownload() {
    if (!resultUrl) return
    const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg'
    void fetch(resultUrl)
      .then((r) => r.blob())
      .then((blob) => downloadBlob(blob, `crop-${Math.round(crop.w)}x${Math.round(crop.h)}.${ext}`))
  }

  const boxStyle = source
    ? {
        left: crop.x * displayScale,
        top: crop.y * displayScale,
        width: crop.w * displayScale,
        height: crop.h * displayScale,
        borderRadius: effectiveRadius * displayScale,
      }
    : undefined

  return (
    <ToolPage
      title="图片裁剪 / 圆角"
      description="拖拽裁剪框，支持比例锁定、圆角与圆形蒙版，本地导出 PNG / JPEG / WebP。"
      badge="离线"
    >
      <div className="panel">
        <div className="toolbar">
          <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()}>
            选择图片
          </button>
          <Select
            value={aspect}
            onChange={(v) => applyAspect(v as AspectMode)}
            aria-label="裁剪比例"
            style={{ minWidth: 120 }}
            options={[
              { value: 'free', label: '自由比例' },
              { value: '1:1', label: '1:1' },
              { value: '4:3', label: '4:3' },
              { value: '3:2', label: '3:2' },
              { value: '16:9', label: '16:9' },
              { value: '9:16', label: '9:16' },
            ]}
          />
          <Select
            value={format}
            onChange={(v) => setFormat(v as OutFormat)}
            aria-label="导出格式"
            style={{ minWidth: 120 }}
            options={[
              { value: 'image/png', label: 'PNG' },
              { value: 'image/jpeg', label: 'JPEG' },
              { value: 'image/webp', label: 'WebP' },
            ]}
          />
          <button type="button" className="btn btn-primary" onClick={() => void handleExport()} disabled={!source}>
            导出
          </button>
          <button type="button" className="btn" onClick={handleDownload} disabled={!resultUrl}>
            下载结果
          </button>
          <span className="status-info">
            {source ? `${source.width}×${source.height} · ${source.name}` : '支持拖拽上传'}
          </span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0]
            if (f) void loadFile(f)
            e.target.value = ''
          }}
        />

        <div className="grid-2 crop-controls" style={{ marginTop: '0.85rem' }}>
          <div className="field">
            <label>圆角半径（px）{circle ? ' · 圆形' : ''}</label>
            <input
              type="range"
              min={0}
              max={Math.max(0, maxRadius)}
              value={effectiveRadius}
              disabled={circle || !source}
              onChange={(e) => setRadius(Number(e.target.value))}
            />
            <div className="toolbar">
              <input
                type="number"
                min={0}
                max={maxRadius}
                value={effectiveRadius}
                disabled={circle || !source}
                onChange={(e) => setRadius(Math.max(0, Number(e.target.value) || 0))}
                style={{ width: 96 }}
              />
              <label className="toolbar" style={{ gap: '0.35rem' }}>
                <input
                  type="checkbox"
                  checked={circle}
                  onChange={(e) => {
                    setCircle(e.target.checked)
                    if (e.target.checked && source) {
                      applyAspect('1:1')
                    }
                  }}
                />
                <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>圆形蒙版</span>
              </label>
            </div>
          </div>
          {format !== 'image/png' ? (
            <div className="field">
              <label>质量 {Math.round(quality * 100)}%</label>
              <input
                type="range"
                min={0.5}
                max={1}
                step={0.01}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
              />
            </div>
          ) : (
            <div className="field">
              <label>裁剪区域（像素）</label>
              <p className="status-info" style={{ margin: 0 }}>
                x={Math.round(crop.x)}, y={Math.round(crop.y)}, {Math.round(crop.w)}×{Math.round(crop.h)}
                {effectiveRadius > 0 ? ` · r=${effectiveRadius}` : ''}
              </p>
            </div>
          )}
        </div>
        {error ? <p className="status-error" style={{ marginTop: '0.65rem' }}>{error}</p> : null}
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>裁剪区</h2>
          </div>
          <div
            className={`crop-stage${dragOver ? ' is-over' : ''}`}
            ref={stageRef}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e: DragEvent) => {
              e.preventDefault()
              setDragOver(false)
              const f = e.dataTransfer.files?.[0]
              if (f) void loadFile(f)
            }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {source ? (
              <div className="crop-canvas-wrap">
                <img
                  ref={imgRef}
                  src={source.url}
                  alt="待裁剪"
                  className="crop-source-img"
                  draggable={false}
                  onLoad={updateDisplayScale}
                />
                <div
                  className="crop-box"
                  style={boxStyle}
                  onPointerDown={(e) => onPointerDown('move', e)}
                >
                  <span className="crop-handle nw" onPointerDown={(e) => onPointerDown('nw', e)} />
                  <span className="crop-handle ne" onPointerDown={(e) => onPointerDown('ne', e)} />
                  <span className="crop-handle sw" onPointerDown={(e) => onPointerDown('sw', e)} />
                  <span className="crop-handle se" onPointerDown={(e) => onPointerDown('se', e)} />
                </div>
              </div>
            ) : (
              <p className="status-info" style={{ margin: '2rem auto', textAlign: 'center' }}>
                拖拽图片到此处，或点击上方选择
              </p>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>结果预览</h2>
            {resultSize > 0 ? <span className="status-info">{formatBytes(resultSize)}</span> : null}
          </div>
          <div className="crop-result">
            {resultUrl ? (
              <img src={resultUrl} alt="裁剪结果" />
            ) : (
              <p className="status-info" style={{ margin: 0 }}>
                调整裁剪框后点击「导出」
              </p>
            )}
          </div>
        </div>
      </div>
    </ToolPage>
  )
}
