import { useEffect, useMemo, useState } from 'react'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import {
  formatJwtTime,
  JWT_CLAIM_LABELS,
  parseJwt,
  verifyJwt,
  type JwtVerifyResult,
} from '../utils/jwt'

/** 演示用 HS256：密钥为 secret（jwt.io 默认示例） */
const DEMO =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5OTk5OTk5OTl9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
const DEMO_SECRET = 'secret'

/**
 * JWT 解析 + 本地验签
 */
export function JwtTool() {
  const [token, setToken] = useState(DEMO)
  const [secret, setSecret] = useState(DEMO_SECRET)
  const [verify, setVerify] = useState<JwtVerifyResult>({
    status: 'idle',
    message: '输入密钥后自动验签',
  })
  const [verifying, setVerifying] = useState(false)
  const { copy } = useCopyFeedback()

  const parsed = useMemo(() => parseJwt(token), [token])
  const alg = parsed.header && typeof parsed.header.alg === 'string' ? parsed.header.alg : ''

  const expInfo = useMemo(() => {
    const exp = parsed.payload?.exp
    if (typeof exp !== 'number') return null
    const ms = exp < 1e12 ? exp * 1000 : exp
    const now = Date.now()
    const expired = now > ms
    return {
      iso: formatJwtTime(exp),
      expired,
      label: expired ? '已过期' : '未过期',
    }
  }, [parsed.payload])

  // 自动验签（防抖）
  useEffect(() => {
    if (!token.trim()) {
      setVerify({ status: 'idle', message: '请粘贴 JWT' })
      return
    }
    if (!parsed.validFormat) {
      setVerify({ status: 'error', message: parsed.error || 'JWT 格式无效' })
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      setVerifying(true)
      void verifyJwt(token, secret).then((result) => {
        if (!cancelled) {
          setVerify(result)
          setVerifying(false)
        }
      })
    }, 280)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [token, secret, parsed.validFormat, parsed.error])

  function verifyStatusClass(status: JwtVerifyResult['status']): string {
    if (status === 'valid') return 'status-ok'
    if (status === 'invalid' || status === 'error') return 'status-error'
    return 'status-info'
  }

  function renderObject(obj: Record<string, unknown> | null, title: string) {
    if (!obj) {
      return (
        <div className="panel">
          <div className="panel-head">
            <h2>{title}</h2>
          </div>
          <p className="status-info">无数据</p>
        </div>
      )
    }

    const pretty = JSON.stringify(obj, null, 2)

    return (
      <div className="panel">
        <div className="panel-head">
          <h2>{title}</h2>
          <button type="button" className="btn btn-ghost" onClick={() => void copy(pretty)}>
            复制 JSON
          </button>
        </div>
        <div className="field-stack">
          {Object.entries(obj).map(([key, value]) => {
            const timeHint =
              key === 'exp' || key === 'iat' || key === 'nbf' ? formatJwtTime(value) : null
            const label = JWT_CLAIM_LABELS[key] ?? key
            return (
              <div key={key} className="field">
                <label>{label}</label>
                <div className="toolbar">
                  <input
                    readOnly
                    value={typeof value === 'string' ? value : JSON.stringify(value)}
                    style={{ flex: 1, fontFamily: 'var(--font-mono, monospace)' }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      void copy(typeof value === 'string' ? value : JSON.stringify(value))
                    }
                  >
                    复制
                  </button>
                </div>
                {timeHint ? (
                  <p className="status-info" style={{ marginTop: '0.25rem' }}>
                    → {timeHint}
                    {key === 'exp' && expInfo ? `（${expInfo.label}）` : ''}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
        <details style={{ marginTop: '0.75rem' }}>
          <summary className="status-info" style={{ cursor: 'pointer' }}>
            原始 JSON
          </summary>
          <pre
            className="code-block"
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              overflow: 'auto',
              fontSize: '0.85rem',
            }}
          >
            {pretty}
          </pre>
        </details>
      </div>
    )
  }

  return (
    <ToolPage
      title="JWT 解析 / 验签"
      description="解析 Header / Payload，并用 Web Crypto 本地校验签名（HS256/384/512、RS256/384/512）。密钥不离开本机。"
      badge="离线"
    >
      <div className="panel">
        <div className="panel-head">
          <h2>Token</h2>
          <div className="toolbar">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setToken(DEMO)
                setSecret(DEMO_SECRET)
              }}
            >
              示例（HS256）
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setToken('')
                setSecret('')
              }}
            >
              清空
            </button>
          </div>
        </div>
        <div className="field">
          <textarea
            rows={5}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="粘贴 JWT（header.payload.signature）…"
            spellCheck={false}
            style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.85rem' }}
          />
        </div>
        {parsed.error ? <p className="status-error">{parsed.error}</p> : null}
        {parsed.validFormat && expInfo ? (
          <p className={expInfo.expired ? 'status-error' : 'status-info'}>
            过期状态：{expInfo.label}
            {expInfo.iso ? `（exp = ${expInfo.iso}）` : ''}
          </p>
        ) : null}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>签名校验</h2>
          <span className="status-info">
            {alg ? `alg: ${alg}` : '未识别算法'}
            {verifying ? ' · 校验中…' : ''}
          </span>
        </div>
        <div className="field">
          <label htmlFor="jwt-secret">
            {alg.startsWith('RS')
              ? '公钥 PEM（SPKI：BEGIN PUBLIC KEY）'
              : '密钥（HS* 共享密钥，明文 UTF-8）'}
          </label>
          <textarea
            id="jwt-secret"
            rows={alg.startsWith('RS') ? 6 : 2}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={
              alg.startsWith('RS')
                ? '-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----'
                : '输入 HMAC 密钥，如 secret'
            }
            spellCheck={false}
            style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.85rem' }}
          />
        </div>
        <p className={verifyStatusClass(verify.status)} style={{ margin: '0.65rem 0 0', fontSize: '1rem' }}>
          {verify.message}
        </p>
        <p className="status-info" style={{ margin: '0.45rem 0 0', lineHeight: 1.55 }}>
          支持：HS256 / HS384 / HS512（共享密钥）、RS256 / RS384 / RS512（公钥 PEM）、none。
          不支持 ES* / PS* / JWK 等。验签在浏览器本地完成。
        </p>
        <div className="toolbar" style={{ marginTop: '0.65rem' }}>
          <button
            type="button"
            className="btn"
            disabled={!token.trim()}
            onClick={() => {
              setVerifying(true)
              void verifyJwt(token, secret).then((r) => {
                setVerify(r)
                setVerifying(false)
              })
            }}
          >
            立即验签
          </button>
        </div>
      </div>

      <div className="grid-2">
        {renderObject(parsed.header, 'Header')}
        {renderObject(parsed.payload, 'Payload')}
      </div>

      {parsed.raw.signature ? (
        <div className="panel">
          <div className="panel-head">
            <h2>Signature</h2>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void copy(parsed.raw.signature)}
            >
              复制
            </button>
          </div>
          <input
            readOnly
            value={parsed.raw.signature}
            style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.85rem' }}
          />
        </div>
      ) : null}
    </ToolPage>
  )
}
