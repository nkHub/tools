import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { Select } from '../components/Select'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'

/** 纠错等级 */
type EccLevel = 'L' | 'M' | 'Q' | 'H'

/**
 * 二维码生成 + 本地识别
 */
export function QrcodeTool() {
  const [text, setText] = useState('https://example.com')
  const [size, setSize] = useState(256)
  const [margin, setMargin] = useState(2)
  const [ecc, setEcc] = useState<EccLevel>('M')
  const [dark, setDark] = useState('#0f172a')
  const [light, setLight] = useState('#ffffff')
  const [dataUrl, setDataUrl] = useState('')
  const [genError, setGenError] = useState('')

  const [scanResult, setScanResult] = useState('')
  const [scanError, setScanError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { copy } = useCopyFeedback()

  /** 生成二维码 data URL */
  async function handleGenerate() {
    const content = text
    if (!content.trim()) {
      setGenError('请输入要编码的内容')
      setDataUrl('')
      return
    }
    try {
      const url = await QRCode.toDataURL(content, {
        width: Math.max(64, Math.min(1024, size)),
        margin: Math.max(0, Math.min(8, margin)),
        errorCorrectionLevel: ecc,
        color: { dark, light },
      })
      setDataUrl(url)
      setGenError('')
    } catch (e) {
      setGenError(e instanceof Error ? e.message : '生成失败')
      setDataUrl('')
    }
  }

  /** 从图片 File 识别二维码 */
  const decodeFile = useCallback(async (file: File) => {
    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('请选择图片文件')
      }
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 不可用')
      ctx.drawImage(bitmap, 0, 0)
      bitmap.close()
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      })
      if (!code) {
        setScanResult('')
        setScanError('未识别到二维码')
        return
      }
      setScanResult(code.data)
      setScanError('')
    } catch (e) {
      setScanResult('')
      setScanError(e instanceof Error ? e.message : '识别失败')
    }
  }, [])

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void decodeFile(file)
    e.target.value = ''
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void decodeFile(file)
  }

  function handleDownload() {
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'qrcode.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <ToolPage
      title="二维码"
      description="本地生成二维码 PNG，并从图片识别内容。不上传服务器。"
      badge="离线"
    >
      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>生成</h2>
          </div>
          <div className="field">
            <label htmlFor="qr-text">内容</label>
            <textarea
              id="qr-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="文本 / URL / 任意字符串"
              spellCheck={false}
              style={{ minHeight: 100 }}
            />
          </div>
          <div className="grid-3" style={{ marginTop: '0.75rem' }}>
            <div className="field">
              <label htmlFor="qr-size">尺寸 (px)</label>
              <input
                id="qr-size"
                type="number"
                min={64}
                max={1024}
                value={size}
                onChange={(e) => setSize(Number(e.target.value) || 256)}
              />
            </div>
            <div className="field">
              <label htmlFor="qr-margin">边距</label>
              <input
                id="qr-margin"
                type="number"
                min={0}
                max={8}
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value) || 0)}
              />
            </div>
            <div className="field">
              <label>纠错等级</label>
              <Select
                value={ecc}
                onChange={(v) => setEcc(v as EccLevel)}
                aria-label="纠错等级"
                options={[
                  { value: 'L', label: 'L 约 7%' },
                  { value: 'M', label: 'M 约 15%' },
                  { value: 'Q', label: 'Q 约 25%' },
                  { value: 'H', label: 'H 约 30%' },
                ]}
              />
            </div>
          </div>
          <div className="toolbar" style={{ marginTop: '0.75rem' }}>
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>前景</span>
              <input type="color" value={dark} onChange={(e) => setDark(e.target.value)} />
            </label>
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>背景</span>
              <input type="color" value={light} onChange={(e) => setLight(e.target.value)} />
            </label>
            <button type="button" className="btn btn-primary" onClick={() => void handleGenerate()}>
              生成
            </button>
            <button type="button" className="btn" onClick={handleDownload} disabled={!dataUrl}>
              下载 PNG
            </button>
          </div>
          {genError ? <p className="status-error" style={{ marginTop: '0.65rem' }}>{genError}</p> : null}
          {dataUrl ? (
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <img
                src={dataUrl}
                alt="二维码预览"
                style={{
                  maxWidth: '100%',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border)',
                  background: light,
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>识别</h2>
          </div>
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
            点击或拖拽二维码图片到此处
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileChange}
            />
          </div>
          {scanError ? <p className="status-error" style={{ marginTop: '0.75rem' }}>{scanError}</p> : null}
          {scanResult ? (
            <div style={{ marginTop: '0.75rem' }}>
              <div className="panel-head">
                <h3>识别结果</h3>
                <button type="button" className="btn btn-ghost" onClick={() => void copy(scanResult)}>
                  复制
                </button>
              </div>
              <pre
                className="json-raw-view"
                style={{ minHeight: 80, maxHeight: 240 }}
              >
                {scanResult}
              </pre>
            </div>
          ) : null}
        </div>
      </div>
    </ToolPage>
  )
}
