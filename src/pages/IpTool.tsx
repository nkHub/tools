import { useCallback, useEffect, useState } from 'react'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'

/** 公网 IP 查询结果（兼容多接口字段） */
interface PublicIpInfo {
  ip: string
  city?: string
  region?: string
  country?: string
  org?: string
  timezone?: string
  raw?: string
}

interface LocalInfo {
  userAgent: string
  language: string
  languages: string
  platform: string
  cookieEnabled: boolean
  online: boolean
  hardwareConcurrency: number
  deviceMemory?: number
  screen: string
  timezone: string
  timezoneOffset: string
  localTime: string
  connection?: string
}

/**
 * 尝试多个公开接口获取公网 IP，任一成功即返回
 * 注意：公网 IP 必须走网络；浏览器无法直接读取「本机局域网 IP」
 */
async function fetchPublicIp(): Promise<PublicIpInfo> {
  const controllers: AbortController[] = []

  const withTimeout = async <T,>(fn: (signal: AbortSignal) => Promise<T>, ms = 8000) => {
    const ac = new AbortController()
    controllers.push(ac)
    const timer = window.setTimeout(() => ac.abort(), ms)
    try {
      return await fn(ac.signal)
    } finally {
      window.clearTimeout(timer)
    }
  }

  // 接口 1：ipapi.co
  const tryIpapi = async (): Promise<PublicIpInfo> => {
    const res = await withTimeout((signal) =>
      fetch('https://ipapi.co/json/', { signal }),
    )
    if (!res.ok) throw new Error(`ipapi.co HTTP ${res.status}`)
    const data = (await res.json()) as Record<string, string>
    if (!data.ip) throw new Error('ipapi.co 无有效 IP')
    return {
      ip: data.ip,
      city: data.city,
      region: data.region,
      country: data.country_name || data.country,
      org: data.org,
      timezone: data.timezone,
      raw: JSON.stringify(data, null, 2),
    }
  }

  // 接口 2：ipify + ipwho.is 补充
  const tryIpify = async (): Promise<PublicIpInfo> => {
    const res = await withTimeout((signal) =>
      fetch('https://api.ipify.org?format=json', { signal }),
    )
    if (!res.ok) throw new Error(`ipify HTTP ${res.status}`)
    const { ip } = (await res.json()) as { ip: string }
    if (!ip) throw new Error('ipify 无有效 IP')

    try {
      const detailRes = await withTimeout((signal) =>
        fetch(`https://ipwho.is/${ip}`, { signal }),
      )
      if (detailRes.ok) {
        const d = (await detailRes.json()) as Record<string, unknown>
        if (d.success !== false) {
          return {
            ip,
            city: String(d.city ?? ''),
            region: String(d.region ?? ''),
            country: String(d.country ?? ''),
            org: String((d.connection as { isp?: string } | undefined)?.isp ?? d.org ?? ''),
            timezone: String((d.timezone as { id?: string } | undefined)?.id ?? ''),
            raw: JSON.stringify(d, null, 2),
          }
        }
      }
    } catch {
      // 详情失败时仍返回 IP
    }

    return { ip, raw: JSON.stringify({ ip }, null, 2) }
  }

  try {
    return await tryIpapi()
  } catch {
    return await tryIpify()
  }
}

function collectLocalInfo(): LocalInfo {
  const nav = navigator as Navigator & {
    deviceMemory?: number
    connection?: { effectiveType?: string; downlink?: number; rtt?: number }
  }
  const conn = nav.connection
  const offsetMin = -new Date().getTimezoneOffset()
  const sign = offsetMin >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)
  const offsetStr = `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages?.join(', ') ?? navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    online: navigator.onLine,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: nav.deviceMemory,
    screen: `${window.screen.width}×${window.screen.height} @${window.devicePixelRatio}x`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: offsetStr,
    localTime: new Date().toLocaleString(),
    connection: conn
      ? `${conn.effectiveType ?? '未知'}${conn.downlink != null ? ` · ${conn.downlink}Mbps` : ''}${conn.rtt != null ? ` · RTT ${conn.rtt}ms` : ''}`
      : undefined,
  }
}

/**
 * 本机 / IP 查询
 * - 本机：浏览器与环境信息（离线可用）
 * - 公网 IP：请求公开接口（需联网）
 */
export function IpTool() {
  const [localInfo, setLocalInfo] = useState<LocalInfo | null>(null)
  const [publicInfo, setPublicInfo] = useState<PublicIpInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { copy } = useCopyFeedback()

  useEffect(() => {
    setLocalInfo(collectLocalInfo())
  }, [])

  const loadPublicIp = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const info = await fetchPublicIp()
      setPublicInfo(info)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '查询失败'
      setError(`公网 IP 查询失败：${msg}。请检查网络，或稍后重试。`)
      setPublicInfo(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPublicIp()
  }, [loadPublicIp])

  const localRows: { label: string; value: string }[] = localInfo
    ? [
        { label: '平台', value: localInfo.platform },
        { label: '语言', value: localInfo.languages },
        { label: '时区', value: `${localInfo.timezone} (${localInfo.timezoneOffset})` },
        { label: '本地时间', value: localInfo.localTime },
        { label: '屏幕', value: localInfo.screen },
        { label: 'CPU 逻辑核心', value: String(localInfo.hardwareConcurrency || '未知') },
        {
          label: '设备内存',
          value: localInfo.deviceMemory != null ? `${localInfo.deviceMemory} GB` : '未知',
        },
        { label: '在线状态', value: localInfo.online ? '在线' : '离线' },
        { label: 'Cookie', value: localInfo.cookieEnabled ? '启用' : '禁用' },
        ...(localInfo.connection
          ? [{ label: '网络', value: localInfo.connection }]
          : []),
        { label: 'User-Agent', value: localInfo.userAgent },
      ]
    : []

  return (
    <ToolPage
      title="本机 / IP 查询"
      description="展示浏览器环境信息；公网 IP 通过公开接口查询（需联网）。无法在纯网页中读取局域网网卡 IP。"
      badge="部分联网"
    >
      <div className="panel">
        <div className="panel-head">
          <h2>公网 IP</h2>
          <div className="toolbar">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void loadPublicIp()}
              disabled={loading}
            >
              {loading ? '查询中…' : '重新查询'}
            </button>
          </div>
        </div>

        {error ? <p className="status-error">{error}</p> : null}

        {publicInfo ? (
          <dl className="kv-list">
            <div className="kv-item">
              <dt>IP 地址</dt>
              <dd>{publicInfo.ip}</dd>
              <button type="button" className="btn btn-ghost" onClick={() => copy(publicInfo.ip)}>
                复制
              </button>
            </div>
            {publicInfo.country ? (
              <div className="kv-item">
                <dt>国家 / 地区</dt>
                <dd>
                  {[publicInfo.country, publicInfo.region, publicInfo.city].filter(Boolean).join(' / ')}
                </dd>
                <span />
              </div>
            ) : null}
            {publicInfo.org ? (
              <div className="kv-item">
                <dt>运营商 / 组织</dt>
                <dd>{publicInfo.org}</dd>
                <span />
              </div>
            ) : null}
            {publicInfo.timezone ? (
              <div className="kv-item">
                <dt>时区</dt>
                <dd>{publicInfo.timezone}</dd>
                <span />
              </div>
            ) : null}
          </dl>
        ) : !error && loading ? (
          <p className="status-info">正在查询公网 IP…</p>
        ) : null}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>本机 / 浏览器信息</h2>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setLocalInfo(collectLocalInfo())}
          >
            刷新
          </button>
        </div>
        <dl className="kv-list">
          {localRows.map((row) => (
            <div className="kv-item" key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
              <button type="button" className="btn btn-ghost" onClick={() => copy(row.value)}>
                复制
              </button>
            </div>
          ))}
        </dl>
        <p className="status-info" style={{ marginTop: '0.85rem' }}>
          说明：浏览器安全限制下，网页无法直接获取本机局域网 IP（如 192.168.x.x）。
          若需局域网 IP，请在系统设置或终端查看。
        </p>
      </div>
    </ToolPage>
  )
}
