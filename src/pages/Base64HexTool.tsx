import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import { Select } from '../components/Select'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import './Base64HexTool.css'

type CodecMode = 'base64' | 'hex'
type TextDirection = 'file-to-text' | 'text-to-file'

const MAX_FILE_BYTES = 20 * 1024 * 1024
const PREVIEW_LIMIT = 200_000

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

function bytesToHex(bytes: Uint8Array, spaced: boolean): string {
  const parts: string[] = []
  for (let i = 0; i < bytes.length; i += 1) {
    parts.push(bytes[i].toString(16).padStart(2, '0'))
  }
  return spaced ? parts.join(' ') : parts.join('')
}

function normalizeBase64(raw: string): string {
  let text = raw.replace(/\s+/g, '')
  if (!text) throw new Error('输入为空')
  if (/[-_]/.test(text)) {
    text = text.replace(/-/g, '+').replace(/_/g, '/')
  }
  const pad = text.length % 4
  if (pad === 1) throw new Error('Base64 长度非法（余 1）')
  if (pad > 0) text += '='.repeat(4 - pad)
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text)) {
    throw new Error('包含非法 Base64 字符')
  }
  return text
}

function base64ToBytes(raw: string): Uint8Array {
  const text = normalizeBase64(raw)
  let binary: string
  try {
    binary = atob(text)
  } catch {
    throw new Error('Base64 解码失败')
  }
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function hexToBytes(raw: string): Uint8Array {
  let text = raw.trim()
  if (!text) throw new Error('输入为空')
  // 去掉 0x 前缀、空白、逗号、冒号
  text = text
    .replace(/^0x/i, '')
    .replace(/[\s,;:_-]+/g, '')
  if (text.length % 2 !== 0) {
    throw new Error('Hex 长度必须为偶数')
  }
  if (!/^[0-9a-fA-F]*$/.test(text)) {
    throw new Error('包含非法 Hex 字符')
  }
  const bytes = new Uint8Array(text.length / 2)
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(text.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function guessExt(mime: string, name?: string): string {
  if (name && name.includes('.')) {
    const ext = name.split('.').pop()
    if (ext && ext.length <= 8) return ext
  }
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'application/json': 'json',
    'text/plain': 'txt',
    'application/zip': 'zip',
    'application/octet-stream': 'bin',
  }
  return map[mime] ?? 'bin'
}

/**
 * Base64 / Hex 与文件互转：上传编码、文本解码下载
 */
export function Base64HexTool() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<CodecMode>('base64')
  const [direction, setDirection] = useState<TextDirection>('file-to-text')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [hexSpaced, setHexSpaced] = useState(true)
  const [fileName, setFileName] = useState('download.bin')
  const [mime, setMime] = useState('application/octet-stream')
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [sourceName, setSourceName] = useState('')

  const { copy } = useCopyFeedback()

  const charCount = useMemo(() => text.length, [text])
  const previewText = useMemo(() => {
    if (text.length <= PREVIEW_LIMIT) return text
    return `${text.slice(0, PREVIEW_LIMIT)}\n\n… 已截断预览（共 ${text.length.toLocaleString()} 字符，复制/下载仍用完整内容）`
  }, [text])

  const encodeFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_BYTES) {
        setError('文件过大（上限约 20MB）')
        return
      }
      try {
        const buffer = await file.arrayBuffer()
        const arr = new Uint8Array(buffer)
        setBytes(arr)
        setSourceName(file.name)
        setMime(file.type || 'application/octet-stream')
        setFileName(file.name || `file.${guessExt(file.type)}`)
        const encoded =
          mode === 'base64' ? bytesToBase64(arr) : bytesToHex(arr, hexSpaced)
        setText(encoded)
        setDirection('file-to-text')
        setError('')
        setInfo(`${file.name} · ${formatBytes(file.size)} · ${mode === 'base64' ? 'Base64' : 'Hex'}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : '读取文件失败')
        setBytes(null)
      }
    },
    [mode, hexSpaced],
  )

  function handleDecodeToBytes() {
    try {
      const arr = mode === 'base64' ? base64ToBytes(text) : hexToBytes(text)
      setBytes(arr)
      setDirection('text-to-file')
      setError('')
      setInfo(`解码成功 · ${formatBytes(arr.byteLength)} · ${arr.byteLength.toLocaleString()} 字节`)
      if (!sourceName) {
        setFileName(`decoded.${mode === 'base64' ? 'bin' : 'bin'}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '解码失败')
      setBytes(null)
      setInfo('')
    }
  }

  function handleConvertBetween() {
    try {
      if (mode === 'base64') {
        const arr = base64ToBytes(text)
        setBytes(arr)
        setMode('hex')
        setText(bytesToHex(arr, hexSpaced))
        setInfo(`已转为 Hex · ${formatBytes(arr.byteLength)}`)
      } else {
        const arr = hexToBytes(text)
        setBytes(arr)
        setMode('base64')
        setText(bytesToBase64(arr))
        setInfo(`已转为 Base64 · ${formatBytes(arr.byteLength)}`)
      }
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '转换失败')
    }
  }

  function handleDownload() {
    let data = bytes
    if (!data) {
      try {
        data = mode === 'base64' ? base64ToBytes(text) : hexToBytes(text)
        setBytes(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : '无法生成文件')
        return
      }
    }
    const blob = new Blob([toArrayBuffer(data)], { type: mime || 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || 'download.bin'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleDownloadText() {
    if (!text) return
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = mode === 'base64' ? 'encoded.b64.txt' : 'encoded.hex.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void encodeFile(file)
    e.target.value = ''
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void encodeFile(file)
  }

  function handleClear() {
    setText('')
    setError('')
    setInfo('')
    setBytes(null)
    setSourceName('')
    setFileName('download.bin')
    setMime('application/octet-stream')
  }

  function handleModeChange(next: CodecMode) {
    if (next === mode) return
    // 若已有字节缓存，直接重编码；否则尝试从当前文本解码后转
    if (bytes) {
      setMode(next)
      setText(next === 'base64' ? bytesToBase64(bytes) : bytesToHex(bytes, hexSpaced))
      setError('')
      return
    }
    if (text.trim()) {
      try {
        const arr = mode === 'base64' ? base64ToBytes(text) : hexToBytes(text)
        setBytes(arr)
        setMode(next)
        setText(next === 'base64' ? bytesToBase64(arr) : bytesToHex(arr, hexSpaced))
        setError('')
        return
      } catch {
        // 切换模式但保留原文，由用户自行处理
      }
    }
    setMode(next)
  }

  function reformatHex() {
    if (mode !== 'hex' || !text.trim()) return
    try {
      const arr = hexToBytes(text)
      setBytes(arr)
      setText(bytesToHex(arr, hexSpaced))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hex 格式化失败')
    }
  }

  return (
    <ToolPage
      title="Base64 / Hex 文件"
      description="任意文件与 Base64、Hex 文本互转，支持拖拽上传、解码下载。全部在浏览器本地完成。"
      badge="离线"
    >
      <div className="panel">
        <div className="toolbar">
          <Select
            value={mode}
            onChange={(v) => handleModeChange(v as CodecMode)}
            aria-label="编码格式"
            style={{ minWidth: 140 }}
            options={[
              { value: 'base64', label: 'Base64' },
              { value: 'hex', label: 'Hex' },
            ]}
          />
          {mode === 'hex' ? (
            <label className="b64hex-check">
              <input
                type="checkbox"
                checked={hexSpaced}
                onChange={(e) => {
                  setHexSpaced(e.target.checked)
                }}
              />
              空格分隔
            </label>
          ) : null}
          <button type="button" className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
            选择文件
          </button>
          <button type="button" className="btn" onClick={handleDecodeToBytes} disabled={!text.trim()}>
            文本 → 字节
          </button>
          <button type="button" className="btn" onClick={handleConvertBetween} disabled={!text.trim()}>
            {mode === 'base64' ? '转 Hex' : '转 Base64'}
          </button>
          {mode === 'hex' ? (
            <button type="button" className="btn btn-ghost" onClick={reformatHex} disabled={!text.trim()}>
              格式化 Hex
            </button>
          ) : null}
          <button type="button" className="btn btn-danger" onClick={handleClear}>
            清空
          </button>
        </div>
        <input ref={fileInputRef} type="file" hidden onChange={handleFileChange} />
        {info ? <p className="status-ok" style={{ margin: '0.65rem 0 0' }}>{info}</p> : null}
        {error ? <p className="status-error" style={{ margin: '0.65rem 0 0' }}>{error}</p> : null}
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>文件</h2>
            <span className="status-info">拖拽或选择 · 上限 20MB</span>
          </div>
          <div
            className={`b64hex-drop ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                fileInputRef.current?.click()
              }
            }}
          >
            <div className="img-drop-hint">
              <strong>{sourceName || '拖拽文件到此处'}</strong>
              <span>
                {bytes
                  ? `${formatBytes(bytes.byteLength)} · ${mime}`
                  : '编码为 Base64 / Hex 文本'}
              </span>
            </div>
          </div>

          <div className="b64hex-download-form">
            <div className="field">
              <label htmlFor="b64hex-name">下载文件名</label>
              <input
                id="b64hex-name"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                spellCheck={false}
              />
            </div>
            <div className="field">
              <label htmlFor="b64hex-mime">MIME</label>
              <input
                id="b64hex-mime"
                value={mime}
                onChange={(e) => setMime(e.target.value)}
                spellCheck={false}
                placeholder="application/octet-stream"
              />
            </div>
            <div className="toolbar">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDownload}
                disabled={!text.trim() && !bytes}
              >
                下载文件
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleDownloadText}
                disabled={!text.trim()}
              >
                下载文本
              </button>
            </div>
            <p className="status-info" style={{ margin: 0 }}>
              方向：{direction === 'file-to-text' ? '文件 → 文本' : '文本 → 文件'}
              {bytes ? ` · ${bytes.byteLength.toLocaleString()} 字节` : ''}
            </p>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>{mode === 'base64' ? 'Base64' : 'Hex'} 文本</h2>
            <div className="toolbar">
              <span className="status-info">{charCount.toLocaleString()} 字符</span>
              <button type="button" className="btn btn-ghost" onClick={() => void copy(text)} disabled={!text}>
                复制
              </button>
            </div>
          </div>
          <div className="field">
            <textarea
              className="code-area b64hex-textarea"
              value={previewText}
              onChange={(e) => {
                // 若处于截断预览，不允许用截断内容覆盖
                if (text.length > PREVIEW_LIMIT) return
                setText(e.target.value)
                setBytes(null)
                setInfo('')
              }}
              readOnly={text.length > PREVIEW_LIMIT}
              placeholder={
                mode === 'base64'
                  ? '粘贴 Base64，或上传文件自动生成…'
                  : '粘贴 Hex（支持 0x、空格、冒号分隔），或上传文件…'
              }
              spellCheck={false}
            />
          </div>
          {text.length > PREVIEW_LIMIT ? (
            <p className="status-info" style={{ marginTop: '0.5rem' }}>
              内容较大，仅预览前 {PREVIEW_LIMIT.toLocaleString()} 字符；可复制完整内容或下载。
              <button
                type="button"
                className="btn btn-ghost"
                style={{ marginLeft: '0.5rem' }}
                onClick={() => {
                  setText('')
                  setBytes(null)
                }}
              >
                清除以重新粘贴
              </button>
            </p>
          ) : null}
        </div>
      </div>

      <div className="panel">
        <p className="status-info" style={{ margin: 0, lineHeight: 1.65 }}>
          说明：Base64 兼容 URL-safe（<code>-</code>/<code>_</code>）与自动 padding；Hex 支持
          <code>0x</code> 前缀及空格、冒号、连字符分隔。数据不离开本机。
        </p>
      </div>
    </ToolPage>
  )
}
