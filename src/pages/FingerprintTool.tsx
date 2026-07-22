import { useCallback, useEffect, useState } from 'react'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'

interface FpItem {
  key: string
  label: string
  value: string
}

/**
 * 简易字符串哈希（FNV-1a 变体 → hex）
 * 仅用于本地展示，非密码学安全
 */
async function hashText(text: string): Promise<string> {
  if (crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return [...new Uint8Array(buf)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 32)
  }
  // 回退：简单滚动哈希
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** Canvas 2D 指纹片段 */
function canvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 240
    canvas.height = 60
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'unsupported'
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillStyle = '#f60'
    ctx.fillRect(10, 10, 100, 30)
    ctx.fillStyle = '#069'
    ctx.fillText('fingerprint-测', 2, 15)
    ctx.strokeStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.beginPath()
    ctx.arc(50, 20, 12, 0, Math.PI * 2)
    ctx.stroke()
    return canvas.toDataURL().slice(-64)
  } catch {
    return 'error'
  }
}

/** WebGL 渲染器信息 */
function webglInfo(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    if (!gl) return 'unsupported'
    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    if (dbg) {
      const vendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)
      const renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)
      return `${vendor} | ${renderer}`
    }
    return `${gl.getParameter(gl.VENDOR)} | ${gl.getParameter(gl.RENDERER)}`
  } catch {
    return 'error'
  }
}

/**
 * 收集本机浏览器环境信息（不上传）
 */
async function collectFingerprint(): Promise<{ items: FpItem[]; hash: string }> {
  const nav = navigator
  const screenObj = window.screen
  const items: FpItem[] = [
    { key: 'userAgent', label: 'User-Agent', value: nav.userAgent },
    { key: 'platform', label: '平台', value: nav.platform || '—' },
    { key: 'language', label: '语言', value: nav.language },
    { key: 'languages', label: '语言列表', value: (nav.languages || []).join(', ') || '—' },
    { key: 'cookieEnabled', label: 'Cookie', value: String(nav.cookieEnabled) },
    { key: 'doNotTrack', label: 'DNT', value: String(nav.doNotTrack ?? '—') },
    { key: 'hardwareConcurrency', label: '逻辑 CPU', value: String(nav.hardwareConcurrency ?? '—') },
    {
      key: 'deviceMemory',
      label: '设备内存 (GB)',
      value: String((nav as Navigator & { deviceMemory?: number }).deviceMemory ?? '—'),
    },
    {
      key: 'maxTouchPoints',
      label: '触摸点',
      value: String(nav.maxTouchPoints ?? 0),
    },
    {
      key: 'screen',
      label: '屏幕',
      value: `${screenObj.width}×${screenObj.height} @${screenObj.colorDepth}bit`,
    },
    {
      key: 'availScreen',
      label: '可用屏幕',
      value: `${screenObj.availWidth}×${screenObj.availHeight}`,
    },
    {
      key: 'devicePixelRatio',
      label: 'DPR',
      value: String(window.devicePixelRatio),
    },
    {
      key: 'timezone',
      label: '时区',
      value: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    {
      key: 'timezoneOffset',
      label: '时区偏移 (min)',
      value: String(new Date().getTimezoneOffset()),
    },
    {
      key: 'locale',
      label: 'Locale',
      value: Intl.DateTimeFormat().resolvedOptions().locale,
    },
    { key: 'canvas', label: 'Canvas 片段', value: canvasFingerprint() },
    { key: 'webgl', label: 'WebGL', value: webglInfo() },
    {
      key: 'storage',
      label: 'Storage',
      value: `localStorage=${typeof localStorage !== 'undefined'} sessionStorage=${typeof sessionStorage !== 'undefined'}`,
    },
    {
      key: 'online',
      label: '在线',
      value: String(nav.onLine),
    },
  ]

  const payload = items.map((i) => `${i.key}=${i.value}`).join('|')
  const hash = await hashText(payload)
  return { items, hash }
}

/**
 * 浏览器指纹工具：展示环境特征与本地哈希
 */
export function FingerprintTool() {
  const [items, setItems] = useState<FpItem[]>([])
  const [hash, setHash] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { copy } = useCopyFeedback()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await collectFingerprint()
      setItems(result.items)
      setHash(result.hash)
    } catch (e) {
      setError(e instanceof Error ? e.message : '采集失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function handleCopyAll() {
    const lines = [`指纹哈希: ${hash}`, ...items.map((i) => `${i.label}: ${i.value}`)]
    void copy(lines.join('\n'))
  }

  return (
    <ToolPage
      title="浏览器指纹"
      description="采集本机浏览器与环境特征，生成简易指纹哈希。数据仅在本地计算，不会上传。"
      badge="本地"
    >
      <div className="panel">
        <div className="panel-head">
          <h2>指纹哈希</h2>
          <div className="toolbar">
            <button type="button" className="btn btn-primary" onClick={() => void load()} disabled={loading}>
              {loading ? '采集中…' : '重新采集'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={handleCopyAll} disabled={!hash}>
              复制全部
            </button>
          </div>
        </div>
        {error ? <p className="status-error">{error}</p> : null}
        <dl className="kv-list">
          <div className="kv-item">
            <dt>SHA-256 前 32 位</dt>
            <dd style={{ fontWeight: 700 }}>{hash || '—'}</dd>
            <button type="button" className="btn btn-ghost" onClick={() => copy(hash)} disabled={!hash}>
              复制
            </button>
          </div>
        </dl>
        <p className="status-info" style={{ marginTop: '0.75rem' }}>
          该哈希由多项环境信息拼接后本地摘要得到，仅供调试参考，不可当作唯一身份标识。
        </p>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>环境明细</h2>
          <span className="status-info">{items.length} 项</span>
        </div>
        {loading && !items.length ? (
          <p className="status-info">正在采集…</p>
        ) : (
          <dl className="kv-list">
            {items.map((item) => (
              <div className="kv-item" key={item.key}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
                <button type="button" className="btn btn-ghost" onClick={() => copy(item.value)}>
                  复制
                </button>
              </div>
            ))}
          </dl>
        )}
      </div>
    </ToolPage>
  )
}
