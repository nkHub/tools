import { useCallback, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import './Base64ImageTool.css'

/** 预览用的图片信息 */
interface ImageMeta {
  /** data URL 或 object URL */
  src: string
  /** MIME，如 image/png */
  mime: string
  /** 宽 */
  width?: number
  /** 高 */
  height?: number
  /** 原始字节大小（估算） */
  sizeBytes?: number
  /** 文件名（若有） */
  fileName?: string
}

/**
 * 将 ArrayBuffer 转为标准 Base64 字符串
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/**
 * 规范化用户输入的 Base64 / data URL
 * 返回 { mime, base64 }
 */
function parseImageBase64Input(raw: string): { mime: string; base64: string } {
  const text = raw.trim()
  if (!text) {
    throw new Error('请输入 Base64 或 data URL')
  }

  // data:image/png;base64,xxxx
  const dataUrlMatch = text.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/i,
  )
  if (dataUrlMatch) {
    return {
      mime: dataUrlMatch[1].toLowerCase(),
      base64: dataUrlMatch[2].replace(/\s+/g, ''),
    }
  }

  // 纯 Base64（可能带空白）
  let base64 = text.replace(/\s+/g, '')
  // URL-safe 兼容
  if (/[-_]/.test(base64)) {
    base64 = base64.replace(/-/g, '+').replace(/_/g, '/')
  }
  const pad = base64.length % 4
  if (pad === 1) {
    throw new Error('Base64 长度非法')
  }
  if (pad > 0) {
    base64 += '='.repeat(4 - pad)
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new Error('包含非法 Base64 字符')
  }

  // 根据魔数猜 MIME
  const mime = guessMimeFromBase64(base64)
  return { mime, base64 }
}

/**
 * 通过 Base64 头部字节猜测图片 MIME
 */
function guessMimeFromBase64(base64: string): string {
  // 取前约 16 字节
  const head = base64.slice(0, 24)
  let binary = ''
  try {
    binary = atob(head.padEnd(Math.ceil(head.length / 4) * 4, '=').slice(0, 24))
  } catch {
    return 'image/png'
  }
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)

  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png'
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  // GIF: GIF8
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif'
  }
  // WEBP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  ) {
    return 'image/webp'
  }
  // BMP: BM
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return 'image/bmp'
  }
  // SVG 文本
  const asText = binary.slice(0, 20).toLowerCase()
  if (asText.includes('svg') || asText.includes('<')) {
    return 'image/svg+xml'
  }
  return 'image/png'
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/svg+xml': 'svg',
  }
  return map[mime] ?? 'png'
}

/**
 * 读取图片尺寸
 */
function loadImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('图片加载失败，请检查 Base64 是否完整'))
    img.src = src
  })
}

/**
 * Base64 ↔ 图片 互转工具
 * - 图片 → Base64（data URL / 纯 Base64）
 * - Base64 → 图片预览与下载
 * 全程本地，不上传
 */
export function Base64ImageTool() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [base64Text, setBase64Text] = useState('')
  const [includeDataUrl, setIncludeDataUrl] = useState(true)
  const [preview, setPreview] = useState<ImageMeta | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const { copy } = useCopyFeedback()

  const charCount = useMemo(() => base64Text.length, [base64Text])

  /**
   * 从 File 生成 Base64 并预览
   */
  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('请选择图片文件（png / jpg / gif / webp 等）')
        return
      }
      // 限制约 15MB，避免浏览器卡顿
      if (file.size > 15 * 1024 * 1024) {
        setError('图片过大（上限约 15MB），请压缩后再试')
        return
      }

      try {
        const buffer = await file.arrayBuffer()
        const b64 = arrayBufferToBase64(buffer)
        const mime = file.type || 'image/png'
        const dataUrl = `data:${mime};base64,${b64}`
        const text = includeDataUrl ? dataUrl : b64
        setBase64Text(text)

        const size = await loadImageSize(dataUrl)
        setPreview({
          src: dataUrl,
          mime,
          width: size.width,
          height: size.height,
          sizeBytes: file.size,
          fileName: file.name,
        })
        setError('')
      } catch (e) {
        setError(e instanceof Error ? e.message : '读取图片失败')
        setPreview(null)
      }
    },
    [includeDataUrl],
  )

  /** 从 Base64 文本还原预览 */
  async function handleBase64ToImage() {
    try {
      const { mime, base64 } = parseImageBase64Input(base64Text)
      // 校验 atob
      try {
        atob(base64)
      } catch {
        throw new Error('Base64 解码失败')
      }
      const dataUrl = `data:${mime};base64,${base64}`
      const size = await loadImageSize(dataUrl)
      // 估算字节：base64 长度 * 3/4
      const sizeBytes = Math.floor((base64.replace(/=+$/, '').length * 3) / 4)
      setPreview({
        src: dataUrl,
        mime,
        width: size.width,
        height: size.height,
        sizeBytes,
      })
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '转换失败')
      setPreview(null)
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void processFile(file)
    // 允许重复选择同一文件
    e.target.value = ''
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void processFile(file)
  }

  function handleDownload() {
    if (!preview) return
    const a = document.createElement('a')
    a.href = preview.src
    a.download = preview.fileName ?? `image.${extFromMime(preview.mime)}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function handleClear() {
    setBase64Text('')
    setPreview(null)
    setError('')
  }

  /** 切换 data URL 开关时，同步改写当前文本 */
  function handleToggleDataUrl(next: boolean) {
    setIncludeDataUrl(next)
    if (!base64Text.trim()) return
    try {
      const { mime, base64 } = parseImageBase64Input(base64Text)
      setBase64Text(next ? `data:${mime};base64,${base64}` : base64)
    } catch {
      // 非合法 base64 时不改写
    }
  }

  return (
    <ToolPage
      title="Base64 图片互转"
      description="图片转 Base64 / Base64 转图片预览与下载。支持拖拽上传，全部在浏览器本地完成。"
      badge="离线"
    >
      <div className="panel">
        <div className="toolbar">
          <label className="toolbar" style={{ gap: '0.35rem' }}>
            <input
              type="checkbox"
              checked={includeDataUrl}
              onChange={(e) => handleToggleDataUrl(e.target.checked)}
            />
            <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
              输出含 data URL 前缀
            </span>
          </label>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            选择图片
          </button>
          <button type="button" className="btn" onClick={() => void handleBase64ToImage()}>
            Base64 → 图片
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => copy(base64Text)}
            disabled={!base64Text}
          >
            复制 Base64
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleDownload}
            disabled={!preview}
          >
            下载图片
          </button>
          <button type="button" className="btn btn-danger" onClick={handleClear}>
            清空
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleFileChange}
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>图片 / 上传</h2>
            {preview?.sizeBytes != null ? (
              <span className="status-info">{formatBytes(preview.sizeBytes)}</span>
            ) : null}
          </div>

          <div
            className={`img-dropzone${dragOver ? ' drag-over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                fileInputRef.current?.click()
              }
            }}
          >
            {preview ? (
              <div className="img-preview-wrap">
                <img src={preview.src} alt="预览" className="img-preview" />
                <div className="img-meta">
                  <span>{preview.mime}</span>
                  {preview.width != null && preview.height != null ? (
                    <span>
                      {preview.width} × {preview.height}
                    </span>
                  ) : null}
                  {preview.fileName ? <span>{preview.fileName}</span> : null}
                </div>
              </div>
            ) : (
              <div className="img-drop-hint">
                <strong>拖拽图片到此处</strong>
                <span>或点击选择文件 · 支持 PNG / JPG / GIF / WEBP / SVG</span>
              </div>
            )}
          </div>
          {error ? <p className="status-error" style={{ marginTop: '0.75rem' }}>{error}</p> : null}
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Base64</h2>
            <span className="status-info">{charCount} 字符</span>
          </div>
          <div className="field">
            <textarea
              className="code-area"
              value={base64Text}
              onChange={(e) => setBase64Text(e.target.value)}
              placeholder="粘贴 data:image/...;base64,... 或纯 Base64，然后点「Base64 → 图片」"
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </ToolPage>
  )
}
