import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Select } from '../components/Select'
import { ToolPage } from '../components/ToolPage'

/** 输出格式 */
type OutFormat = 'image/jpeg' | 'image/png' | 'image/webp'

interface SourceMeta {
  /** object URL */
  url: string
  width: number
  height: number
  sizeBytes: number
  name: string
  type: string
}

/**
 * 格式化字节数
 */
function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * 图片压缩 / 改尺寸（Canvas）
 */
export function ImageTool() {
  const [source, setSource] = useState<SourceMeta | null>(null)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [keepRatio, setKeepRatio] = useState(true)
  const [format, setFormat] = useState<OutFormat>('image/jpeg')
  const [quality, setQuality] = useState(0.85)
  const [resultUrl, setResultUrl] = useState('')
  const [resultSize, setResultSize] = useState(0)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const ratioRef = useRef(1)

  /** 加载图片文件为源 */
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
      // 释放旧 URL
      setSource((prev) => {
        if (prev) URL.revokeObjectURL(prev.url)
        return {
          url,
          width: img.naturalWidth,
          height: img.naturalHeight,
          sizeBytes: file.size,
          name: file.name,
          type: file.type,
        }
      })
      setWidth(img.naturalWidth)
      setHeight(img.naturalHeight)
      ratioRef.current = img.naturalWidth / Math.max(1, img.naturalHeight)
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

  function handleWidthChange(w: number) {
    setWidth(w)
    if (keepRatio && ratioRef.current > 0) {
      setHeight(Math.max(1, Math.round(w / ratioRef.current)))
    }
  }

  function handleHeightChange(h: number) {
    setHeight(h)
    if (keepRatio && ratioRef.current > 0) {
      setWidth(Math.max(1, Math.round(h * ratioRef.current)))
    }
  }

  /** Canvas 导出 */
  async function handleProcess() {
    if (!source) {
      setError('请先选择图片')
      return
    }
    const w = Math.max(1, Math.min(8192, width || 1))
    const h = Math.max(1, Math.min(8192, height || 1))
    try {
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('源图加载失败'))
        img.src = source.url
      })
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 不可用')
      // JPEG 无透明，填白底
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
      }
      ctx.drawImage(img, 0, 0, w, h)

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (b) => resolve(b),
          format,
          format === 'image/png' ? undefined : quality,
        )
      })
      if (!blob) throw new Error('导出失败')
      const url = URL.createObjectURL(blob)
      setResultUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      setResultSize(blob.size)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '处理失败')
    }
  }

  function handleDownload() {
    if (!resultUrl) return
    const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg'
    const a = document.createElement('a')
    a.href = resultUrl
    a.download = `compressed.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void loadFile(file)
    e.target.value = ''
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void loadFile(file)
  }

  function handleResetSize() {
    if (!source) return
    setWidth(source.width)
    setHeight(source.height)
  }

  return (
    <ToolPage
      title="图片压缩"
      description="使用 Canvas 调整尺寸、选择 JPEG/PNG/WebP 质量导出。全部在浏览器本地完成。"
      badge="离线"
    >
      <div className="panel">
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click()
          }}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `1px dashed ${dragOver ? '#38bdf8' : 'var(--border)'}`,
            borderRadius: '0.75rem',
            padding: '1.5rem',
            textAlign: 'center',
            color: 'var(--muted)',
            cursor: 'pointer',
            background: dragOver ? 'rgba(56,189,248,0.08)' : 'var(--surface-2)',
          }}
        >
          点击或拖拽图片到此处
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
        </div>
      </div>

      {source ? (
        <>
          <div className="panel">
            <div className="toolbar">
              <div className="field" style={{ minWidth: 100 }}>
                <label htmlFor="img-w">宽</label>
                <input
                  id="img-w"
                  type="number"
                  min={1}
                  max={8192}
                  value={width}
                  onChange={(e) => handleWidthChange(Number(e.target.value) || 1)}
                />
              </div>
              <div className="field" style={{ minWidth: 100 }}>
                <label htmlFor="img-h">高</label>
                <input
                  id="img-h"
                  type="number"
                  min={1}
                  max={8192}
                  value={height}
                  onChange={(e) => handleHeightChange(Number(e.target.value) || 1)}
                />
              </div>
              <label className="toolbar" style={{ gap: '0.35rem', marginTop: '1.2rem' }}>
                <input
                  type="checkbox"
                  checked={keepRatio}
                  onChange={(e) => setKeepRatio(e.target.checked)}
                />
                <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>锁定比例</span>
              </label>
              <div className="field" style={{ minWidth: 140, marginTop: 0 }}>
                <label>格式</label>
                <Select
                  value={format}
                  onChange={(v) => setFormat(v as OutFormat)}
                  aria-label="输出格式"
                  options={[
                    { value: 'image/jpeg', label: 'JPEG' },
                    { value: 'image/png', label: 'PNG' },
                    { value: 'image/webp', label: 'WebP' },
                  ]}
                />
              </div>
              {format !== 'image/png' ? (
                <div className="field" style={{ minWidth: 160 }}>
                  <label htmlFor="img-q">质量 {(quality * 100).toFixed(0)}%</label>
                  <input
                    id="img-q"
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.01}
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                  />
                </div>
              ) : null}
              <button type="button" className="btn btn-ghost" onClick={handleResetSize} style={{ marginTop: '1.2rem' }}>
                重置尺寸
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void handleProcess()} style={{ marginTop: '1.2rem' }}>
                处理
              </button>
              <button type="button" className="btn" onClick={handleDownload} disabled={!resultUrl} style={{ marginTop: '1.2rem' }}>
                下载结果
              </button>
            </div>
            {error ? <p className="status-error" style={{ marginTop: '0.65rem' }}>{error}</p> : null}
          </div>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-head">
                <h2>原图</h2>
                <span className="status-info">
                  {source.width}×{source.height} · {formatBytes(source.sizeBytes)}
                </span>
              </div>
              <img
                src={source.url}
                alt="原图"
                style={{ maxWidth: '100%', borderRadius: '0.65rem', border: '1px solid var(--border)' }}
              />
            </div>
            <div className="panel">
              <div className="panel-head">
                <h2>结果</h2>
                <span className="status-info">
                  {resultUrl
                    ? `${width}×${height} · ${formatBytes(resultSize)}${
                        source.sizeBytes
                          ? ` · ${((resultSize / source.sizeBytes) * 100).toFixed(1)}%`
                          : ''
                      }`
                    : '尚未处理'}
                </span>
              </div>
              {resultUrl ? (
                <img
                  src={resultUrl}
                  alt="结果"
                  style={{ maxWidth: '100%', borderRadius: '0.65rem', border: '1px solid var(--border)' }}
                />
              ) : (
                <p className="status-info" style={{ margin: 0 }}>
                  调整参数后点击「处理」
                </p>
              )}
            </div>
          </div>
        </>
      ) : error ? (
        <p className="status-error">{error}</p>
      ) : null}
    </ToolPage>
  )
}
