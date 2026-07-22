import { useMemo, useState } from 'react'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import { formatJwtTime, JWT_CLAIM_LABELS, parseJwt } from '../utils/jwt'

const DEMO =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5OTk5OTk5OTl9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

/**
 * JWT 解析工具（不验证签名，纯本地）
 */
export function JwtTool() {
  const [token, setToken] = useState(DEMO)
  const { copy } = useCopyFeedback()

  const parsed = useMemo(() => parseJwt(token), [token])

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

  function renderObject(obj: Record<string, unknown> | null, title: string) {
    if (!obj) {
      return (
        <div className="panel">
          <div className="panel-head">
            <h2>{title}</h2>
          </div>
          <p className="hint">无数据</p>
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
                  <p className="hint" style={{ marginTop: '0.25rem' }}>
                    → {timeHint}
                    {key === 'exp' && expInfo ? `（${expInfo.label}）` : ''}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
        <details style={{ marginTop: '0.75rem' }}>
          <summary className="hint" style={{ cursor: 'pointer' }}>
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
      title="JWT 解析"
      description="解析 JWT Header / Payload，展示常见 claim 与时间。不验证签名，数据不离开本机。"
      badge="离线"
    >
      <div className="panel">
        <div className="panel-head">
          <h2>Token</h2>
          <div className="toolbar">
            <button type="button" className="btn btn-ghost" onClick={() => setToken(DEMO)}>
              示例
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setToken('')}>
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
        {parsed.error ? <p className="error-msg">{parsed.error}</p> : null}
        {parsed.validFormat && expInfo ? (
          <p className={expInfo.expired ? 'error-msg' : 'hint'}>
            过期状态：{expInfo.label}
            {expInfo.iso ? `（exp = ${expInfo.iso}）` : ''}
          </p>
        ) : null}
      </div>

      <div
        className="grid-2"
        style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}
      >
        {renderObject(parsed.header, 'Header')}
        {renderObject(parsed.payload, 'Payload')}
      </div>

      {parsed.raw.signature ? (
        <div className="panel" style={{ marginTop: '1rem' }}>
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
          <p className="hint" style={{ marginTop: '0.5rem' }}>
            本工具不验证签名，仅展示原始段。
          </p>
        </div>
      ) : null}
    </ToolPage>
  )
}
