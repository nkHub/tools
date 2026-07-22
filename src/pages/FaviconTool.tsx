import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import './FaviconTool.css'

/** 常用 favicon / PWA 尺寸 */
const PRESET_SIZES = [16, 32, 48, 64, 96, 128, 180, 192, 256, 512] as const

interface SourceImage {
  url: string
  width: number
  height: number
  name: string
}

interface ExportItem {
  size: number
  url: string
  blob: Blob
}

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

/**
 * 将图片缩放到 size×size（contain 居中，透明底）
 */
async function renderSquarePng(img: HTMLImageElement, size: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 不可用')
  ctx.clearRect(0, 0, size, size)
  const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight)
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))
  const x = Math.floor((size - w) / 2)
  const y = Math.floor((size - h) / 2)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, x, y, w, h)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('导出 PNG 失败')
  return blob
}

/**
 * Favicon / 多尺寸 PNG 导出
 */
export function FaviconTool() {
  const [source, setSource] = useState<SourceImage | null>(null)
  const [selected, setSelected] = useState<number[]>([16, 32, 48, 180, 192, 512])
  const [customSize, setCustomSize] = useState('24')
  const [exports, setExports] = useState<ExportItem[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const sourceUrlRef = useRef<string | null>(null)
  const exportUrlsRef = useRef<string[]>([])
  const { copy } = useCopyFeedback()

  const sizes = useMemo(
    () => [...new Set(selected)].filter((n) => n >= 8 && n <= 2048).sort((a, b) => a - b),
    [selected],
  )

  const revokeExports = useCallback((items: ExportItem[]) => {
    for (const it of items) URL.revokeObjectURL(it.url)
  }, [])

  useEffect(() => {
    return () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current)
      for (const u of exportUrlsRef.current) URL.revokeObjectURL(u)
    }
  }, [])

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
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current)
      sourceUrlRef.current = url
      setSource({
        url,
        width: img.naturalWidth,
        height: img.naturalHeight,
        name: file.name,
      })
      setExports((prev) => {
        revokeExports(prev)
        exportUrlsRef.current = []
        return []
      })
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '读取失败')
    }
  }, [revokeExports])

  function toggleSize(size: number) {
    setSelected((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]))
  }

  function addCustomSize() {
    const n = Math.round(Number(customSize))
    if (!Number.isFinite(n) || n < 8 || n > 2048) {
      setError('自定义尺寸请输入 8–2048 的整数')
      return
    }
    setSelected((prev) => (prev.includes(n) ? prev : [...prev, n]))
    setError('')
  }

  async function handleGenerate() {
    if (!source) {
      setError('请先上传图片')
      return
    }
    if (sizes.length === 0) {
      setError('请至少选择一个尺寸')
      return
    }
    setBusy(true)
    setError('')
    try {
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('源图加载失败'))
        img.src = source.url
      })
      const next: ExportItem[] = []
      for (const size of sizes) {
        const blob = await renderSquarePng(img, size)
        next.push({ size, blob, url: URL.createObjectURL(blob) })
      }
      setExports((prev) => {
        revokeExports(prev)
        exportUrlsRef.current = next.map((i) => i.url)
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setBusy(false)
    }
  }

  async function downloadAll() {
    for (const item of exports) {
      downloadBlob(item.blob, `favicon-${item.size}x${item.size}.png`)
      await new Promise((r) => setTimeout(r, 120))
    }
  }

  const htmlSnippet = useMemo(() => {
    if (exports.length === 0) return ''
    const lines = exports.map((e) => {
      if (e.size === 180) {
        return `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`
      }
      if (e.size === 192 || e.size === 512) {
        return `<!-- ${e.size}x${e.size} 可用于 web manifest icons -->`
      }
      return `<link rel="icon" type="image/png" sizes="${e.size}x${e.size}" href="/favicon-${e.size}x${e.size}.png">`
    })
    return lines.join('\n')
  }, [exports])

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void loadFile(file)
  }

  return (
    <ToolPage
      title="Favicon 多尺寸"
      description="上传任意图片，一键导出常用 favicon / PWA 多尺寸 PNG，并生成 HTML link 片段。纯本地 Canvas 处理。"
      badge="离线"
    >
      <div className="panel">
        <div className="toolbar">
          <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()}>
            选择图片
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleGenerate()}
            disabled={!source || busy || sizes.length === 0}
          >
            {busy ? '生成中…' : '生成 PNG'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void downloadAll()}
            disabled={exports.length === 0}
          >
            全部下载
          </button>
          <span className="status-info">
            {source
              ? `${source.width}×${source.height} · ${source.name}`
              : '建议使用正方形 PNG / SVG 截图'}
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

        <div
          className={`favicon-drop${dragOver ? ' is-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click()
          }}
        >
          {source ? (
            <img src={source.url} alt="源图预览" className="favicon-source-preview" />
          ) : (
            <p className="status-info" style={{ margin: 0 }}>
              拖拽图片到此处，或点击选择
            </p>
          )}
        </div>

        <div className="favicon-size-grid" style={{ marginTop: '0.85rem' }}>
          {PRESET_SIZES.map((size) => (
            <label key={size} className="favicon-size-chip">
              <input
                type="checkbox"
                checked={selected.includes(size)}
                onChange={() => toggleSize(size)}
              />
              <span>{size}×{size}</span>
            </label>
          ))}
        </div>
        <div className="toolbar" style={{ marginTop: '0.65rem' }}>
          <div className="field" style={{ margin: 0, minWidth: 120 }}>
            <label>自定义尺寸</label>
            <input
              value={customSize}
              onChange={(e) => setCustomSize(e.target.value)}
              inputMode="numeric"
              placeholder="如 24"
            />
          </div>
          <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-end' }} onClick={addCustomSize}>
            添加尺寸
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ alignSelf: 'flex-end' }}
            onClick={() => setSelected([...PRESET_SIZES])}
          >
            全选预设
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ alignSelf: 'flex-end' }}
            onClick={() => setSelected([])}
          >
            清空
          </button>
        </div>
        {error ? <p className="status-error" style={{ marginTop: '0.65rem' }}>{error}</p> : null}
      </div>

      {exports.length > 0 ? (
        <>
          <div className="panel">
            <div className="panel-head">
              <h2>预览与下载（{exports.length}）</h2>
            </div>
            <div className="favicon-export-grid">
              {exports.map((item) => (
                <div key={item.size} className="favicon-export-card">
                  <div className="favicon-export-preview" style={{ width: Math.min(96, item.size + 24) }}>
                    <img src={item.url} alt={`${item.size}px`} width={Math.min(item.size, 72)} height={Math.min(item.size, 72)} />
                  </div>
                  <strong>{item.size}×{item.size}</strong>
                  <span className="status-info">{formatBytes(item.blob.size)}</span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => downloadBlob(item.blob, `favicon-${item.size}x${item.size}.png`)}
                  >
                    下载
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>HTML 引用片段</h2>
              <button type="button" className="btn btn-ghost" onClick={() => void copy(htmlSnippet)}>
                复制
              </button>
            </div>
            <pre className="favicon-snippet">{htmlSnippet}</pre>
            <p className="status-info" style={{ margin: '0.5rem 0 0' }}>
              实际部署时请把文件放到站点根目录或按需改 href；ICO 需额外工具合成，本页导出 PNG。
            </p>
          </div>
        </>
      ) : null}
    </ToolPage>
  )
}
