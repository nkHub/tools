import { useMemo, useState } from 'react'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import {
  buildQuery,
  decodeComponent,
  decodeFullUri,
  encodeComponent,
  encodeFullUri,
  parseQuery,
  parseUrl,
  type QueryPair,
} from '../utils/url-tools'

const DEMO_URL =
  'https://user:pass@example.com:8080/path/to/page?name=%E5%BC%A0%E4%B8%89&id=42&tag=a&tag=b#section-1'

/**
 * URL 编解码 / 结构解析 / 查询参数工具
 */
export function UrlTool() {
  const [tab, setTab] = useState<'parse' | 'codec' | 'query'>('parse')
  const { copy } = useCopyFeedback()

  // —— 解析 ——
  const [urlInput, setUrlInput] = useState(DEMO_URL)
  const parsed = useMemo(() => parseUrl(urlInput), [urlInput])

  // —— 编解码 ——
  const [codecIn, setCodecIn] = useState('你好 World & a=1')
  const [codecMode, setCodecMode] = useState<'component' | 'uri'>('component')

  const encoded = useMemo(() => {
    try {
      return codecMode === 'component' ? encodeComponent(codecIn) : encodeFullUri(codecIn)
    } catch (e) {
      return `错误：${e instanceof Error ? e.message : String(e)}`
    }
  }, [codecIn, codecMode])

  const decoded = useMemo(() => {
    try {
      return codecMode === 'component' ? decodeComponent(codecIn) : decodeFullUri(codecIn)
    } catch (e) {
      return `错误：${e instanceof Error ? e.message : String(e)}`
    }
  }, [codecIn, codecMode])

  // —— Query ——
  const [queryInput, setQueryInput] = useState(
    'name=%E5%BC%A0%E4%B8%89&id=42&tag=a&tag=b&empty=',
  )
  const [pairs, setPairs] = useState<QueryPair[]>(() => parseQuery(queryInput))

  function handleParseQuery() {
    setPairs(parseQuery(queryInput))
  }

  function updatePair(index: number, field: 'key' | 'value', value: string) {
    setPairs((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  function removePair(index: number) {
    setPairs((prev) => prev.filter((_, i) => i !== index))
  }

  function addPair() {
    setPairs((prev) => [...prev, { key: '', value: '' }])
  }

  const builtQuery = useMemo(() => buildQuery(pairs, true), [pairs])
  const builtQueryNoQ = useMemo(() => buildQuery(pairs, false), [pairs])

  const partRows: Array<{ label: string; value: string }> = parsed.ok
    ? [
        { label: 'href', value: parsed.href },
        { label: 'origin', value: parsed.origin },
        { label: 'protocol', value: parsed.protocol },
        { label: 'username', value: parsed.username },
        { label: 'password', value: parsed.password },
        { label: 'host', value: parsed.host },
        { label: 'hostname', value: parsed.hostname },
        { label: 'port', value: parsed.port },
        { label: 'pathname', value: parsed.pathname },
        { label: 'search', value: parsed.search },
        { label: 'hash', value: parsed.hash },
      ]
    : []

  const queryFromUrl = useMemo(
    () => (parsed.ok ? parseQuery(parsed.search) : []),
    [parsed],
  )

  return (
    <ToolPage
      title="URL 工具"
      description="URL 结构解析、encode/decode、查询参数拆表与重组。全部本地处理。"
      badge="离线"
    >
      <div className="toolbar" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button
          type="button"
          className={`btn ${tab === 'parse' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('parse')}
        >
          结构解析
        </button>
        <button
          type="button"
          className={`btn ${tab === 'codec' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('codec')}
        >
          编解码
        </button>
        <button
          type="button"
          className={`btn ${tab === 'query' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('query')}
        >
          查询参数
        </button>
      </div>

      {tab === 'parse' ? (
        <>
          <div className="panel">
            <div className="panel-head">
              <h2>URL 输入</h2>
              <div className="toolbar">
                <button type="button" className="btn btn-ghost" onClick={() => setUrlInput(DEMO_URL)}>
                  示例
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setUrlInput('')}>
                  清空
                </button>
              </div>
            </div>
            <div className="field">
              <textarea
                rows={4}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="粘贴完整 URL…"
                spellCheck={false}
                style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.85rem' }}
              />
            </div>
            {parsed.error ? <p className="error-msg">{parsed.error}</p> : null}
            {!parsed.ok && urlInput.trim() && !parsed.error ? (
              <p className="hint">无法解析，可尝试补全协议（如 https://）</p>
            ) : null}
          </div>

          {parsed.ok ? (
            <div className="panel" style={{ marginTop: '1rem' }}>
              <div className="panel-head">
                <h2>组成部分</h2>
              </div>
              <div className="field-stack">
                {partRows.map(({ label, value }) => (
                  <div key={label} className="field">
                    <label>{label}</label>
                    <div className="toolbar">
                      <input
                        readOnly
                        value={value || '（空）'}
                        style={{ flex: 1, fontFamily: 'var(--font-mono, monospace)' }}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={!value}
                        onClick={() => void copy(value)}
                      >
                        复制
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {parsed.ok && queryFromUrl.length > 0 ? (
            <div className="panel" style={{ marginTop: '1rem' }}>
              <div className="panel-head">
                <h2>Query 预览（{queryFromUrl.length}）</h2>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setQueryInput(parsed.search.startsWith('?') ? parsed.search.slice(1) : parsed.search)
                    setPairs(queryFromUrl)
                    setTab('query')
                  }}
                >
                  到查询参数编辑
                </button>
              </div>
              <QueryTable pairs={queryFromUrl} copy={copy} readOnly />
            </div>
          ) : null}
        </>
      ) : null}

      {tab === 'codec' ? (
        <div className="panel">
          <div className="toolbar" style={{ marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button
              type="button"
              className={`btn ${codecMode === 'component' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setCodecMode('component')}
            >
              encodeURIComponent
            </button>
            <button
              type="button"
              className={`btn ${codecMode === 'uri' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setCodecMode('uri')}
            >
              encodeURI
            </button>
          </div>
          <p className="hint" style={{ marginBottom: '0.75rem' }}>
            {codecMode === 'component'
              ? 'component：编码查询参数值等片段，会编码 & = ? 等。'
              : 'URI：编码完整 URL，保留 : / ? # 等保留字符。'}
          </p>
          <div className="field">
            <label>输入</label>
            <textarea
              rows={5}
              value={codecIn}
              onChange={(e) => setCodecIn(e.target.value)}
              spellCheck={false}
            />
          </div>
          <div className="field" style={{ marginTop: '0.75rem' }}>
            <label>编码结果</label>
            <div className="toolbar">
              <textarea
                readOnly
                rows={3}
                value={encoded}
                style={{ flex: 1, fontFamily: 'var(--font-mono, monospace)' }}
              />
            </div>
            <div className="toolbar" style={{ marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => void copy(encoded)}>
                复制编码
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setCodecIn(encoded)}>
                用编码结果作为输入
              </button>
            </div>
          </div>
          <div className="field" style={{ marginTop: '0.75rem' }}>
            <label>解码结果（对当前输入做 decode）</label>
            <div className="toolbar">
              <textarea
                readOnly
                rows={3}
                value={decoded}
                style={{ flex: 1, fontFamily: 'var(--font-mono, monospace)' }}
              />
            </div>
            <div className="toolbar" style={{ marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => void copy(decoded)}>
                复制解码
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'query' ? (
        <>
          <div className="panel">
            <div className="panel-head">
              <h2>Query 字符串</h2>
              <div className="toolbar">
                <button type="button" className="btn btn-primary" onClick={handleParseQuery}>
                  解析
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setQueryInput('name=%E5%BC%A0%E4%B8%89&id=42&tag=a&tag=b&empty=')
                    setPairs(parseQuery('name=%E5%BC%A0%E4%B8%89&id=42&tag=a&tag=b&empty='))
                  }}
                >
                  示例
                </button>
              </div>
            </div>
            <div className="field">
              <textarea
                rows={3}
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="name=value&foo=bar 或完整 URL"
                spellCheck={false}
                style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div className="panel" style={{ marginTop: '1rem' }}>
            <div className="panel-head">
              <h2>键值表（可编辑）</h2>
              <button type="button" className="btn btn-ghost" onClick={addPair}>
                添加一行
              </button>
            </div>
            {pairs.length === 0 ? (
              <p className="hint">暂无参数，点击「解析」或「添加一行」</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '0.5rem',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        Key
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '0.5rem',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        Value
                      </th>
                      <th
                        style={{
                          textAlign: 'right',
                          padding: '0.5rem',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pairs.map((p, i) => (
                      <tr key={i}>
                        <td style={{ padding: '0.35rem', borderBottom: '1px solid var(--border)' }}>
                          <input
                            value={p.key}
                            onChange={(e) => updatePair(i, 'key', e.target.value)}
                            style={{ width: '100%', fontFamily: 'var(--font-mono, monospace)' }}
                          />
                        </td>
                        <td style={{ padding: '0.35rem', borderBottom: '1px solid var(--border)' }}>
                          <input
                            value={p.value}
                            onChange={(e) => updatePair(i, 'value', e.target.value)}
                            style={{ width: '100%', fontFamily: 'var(--font-mono, monospace)' }}
                          />
                        </td>
                        <td
                          style={{
                            padding: '0.35rem',
                            borderBottom: '1px solid var(--border)',
                            textAlign: 'right',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => void copy(`${p.key}=${p.value}`)}
                          >
                            复制
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => removePair(i)}
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel" style={{ marginTop: '1rem' }}>
            <div className="panel-head">
              <h2>重组结果</h2>
            </div>
            <div className="field">
              <label>带 ?</label>
              <div className="toolbar">
                <input
                  readOnly
                  value={builtQuery}
                  style={{ flex: 1, fontFamily: 'var(--font-mono, monospace)' }}
                />
                <button type="button" className="btn btn-ghost" onClick={() => void copy(builtQuery)}>
                  复制
                </button>
              </div>
            </div>
            <div className="field" style={{ marginTop: '0.5rem' }}>
              <label>不带 ?</label>
              <div className="toolbar">
                <input
                  readOnly
                  value={builtQueryNoQ}
                  style={{ flex: 1, fontFamily: 'var(--font-mono, monospace)' }}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => void copy(builtQueryNoQ)}
                >
                  复制
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </ToolPage>
  )
}

/** 只读 query 表格 */
function QueryTable({
  pairs,
  copy,
  readOnly: _readOnly,
}: {
  pairs: QueryPair[]
  copy: (t: string) => void | Promise<boolean>
  readOnly?: boolean
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
              Key
            </th>
            <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
              Value
            </th>
            <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((p, i) => (
            <tr key={`${p.key}-${i}`}>
              <td
                style={{
                  padding: '0.5rem',
                  borderBottom: '1px solid var(--border)',
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {p.key}
              </td>
              <td
                style={{
                  padding: '0.5rem',
                  borderBottom: '1px solid var(--border)',
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {p.value}
              </td>
              <td
                style={{
                  padding: '0.5rem',
                  borderBottom: '1px solid var(--border)',
                  textAlign: 'right',
                }}
              >
                <button type="button" className="btn btn-ghost" onClick={() => void copy(p.value)}>
                  复制值
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
