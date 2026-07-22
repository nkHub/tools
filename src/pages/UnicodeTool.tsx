import { useMemo, useState } from 'react'
import { Select } from '../components/Select'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import {
  NAMED_ENTITIES,
  countCodePoints,
  decodeHtml,
  decodeUnicodeEscape,
  encodeHtml,
  encodeUnicodeEscape,
  inspectCodePoints,
  type HtmlEncodeMode,
  type UnicodeEscapeStyle,
} from '../utils/unicode-entities'
import './UnicodeTool.css'

type Tab = 'html' | 'escape' | 'inspect' | 'named'

const DEMO = 'Hello 世界 🚀 <tag> & "quotes"'

/**
 * Unicode / HTML 实体工具
 */
export function UnicodeTool() {
  const [tab, setTab] = useState<Tab>('html')
  const { copy } = useCopyFeedback()

  // HTML
  const [htmlIn, setHtmlIn] = useState(DEMO)
  const [htmlMode, setHtmlMode] = useState<HtmlEncodeMode>('minimal')
  const htmlEncoded = useMemo(() => encodeHtml(htmlIn, htmlMode), [htmlIn, htmlMode])
  const htmlDecoded = useMemo(() => decodeHtml(htmlIn), [htmlIn])

  // Escape
  const [escIn, setEscIn] = useState(DEMO)
  const [escStyle, setEscStyle] = useState<UnicodeEscapeStyle>('js')
  const escEncoded = useMemo(() => encodeUnicodeEscape(escIn, escStyle), [escIn, escStyle])
  const escDecoded = useMemo(() => {
    try {
      return decodeUnicodeEscape(escIn)
    } catch (e) {
      return `错误：${e instanceof Error ? e.message : String(e)}`
    }
  }, [escIn])

  // Inspect
  const [inspectIn, setInspectIn] = useState('A中🚀\u00A0<>')
  const points = useMemo(() => inspectCodePoints(inspectIn, 400), [inspectIn])
  const stats = useMemo(() => {
    const bytes = new TextEncoder().encode(inspectIn)
    return {
      codePoints: countCodePoints(inspectIn),
      utf16: inspectIn.length,
      utf8Bytes: bytes.length,
    }
  }, [inspectIn])

  // Named search
  const [namedQ, setNamedQ] = useState('')
  const namedList = useMemo(() => {
    const q = namedQ.trim().toLowerCase()
    if (!q) return NAMED_ENTITIES
    return NAMED_ENTITIES.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.desc.includes(namedQ.trim()) ||
        e.char === namedQ.trim() ||
        `&#${e.char.codePointAt(0)};`.includes(q),
    )
  }, [namedQ])

  return (
    <ToolPage
      title="Unicode / HTML 实体"
      description="HTML 实体编解码、Unicode 转义、码点检视与常用命名实体速查。全部本地处理。"
      badge="离线"
    >
      <div className="panel">
        <div className="view-tabs" role="tablist" aria-label="功能切换">
          {(
            [
              ['html', 'HTML 实体'],
              ['escape', 'Unicode 转义'],
              ['inspect', '码点检视'],
              ['named', '命名实体'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              className={`view-tab${tab === id ? ' active' : ''}`}
              aria-selected={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'html' ? (
        <div className="panel">
          <div className="toolbar" style={{ marginBottom: '0.75rem' }}>
            <Select
              value={htmlMode}
              onChange={(v) => setHtmlMode(v as HtmlEncodeMode)}
              aria-label="编码模式"
              style={{ minWidth: 180 }}
              options={[
                { value: 'minimal', label: '最小（& < > " \'）' },
                { value: 'named', label: '命名实体优先' },
                { value: 'decimal', label: '十进制 &#N;' },
                { value: 'hex', label: '十六进制 &#xH;' },
              ]}
            />
            <button type="button" className="btn btn-ghost" onClick={() => setHtmlIn(DEMO)}>
              示例
            </button>
            <button type="button" className="btn btn-danger" onClick={() => setHtmlIn('')}>
              清空
            </button>
          </div>
          <div className="field">
            <label>输入（原文或实体）</label>
            <textarea
              className="code-area unicode-area"
              value={htmlIn}
              onChange={(e) => setHtmlIn(e.target.value)}
              spellCheck={false}
              placeholder="粘贴文本或 HTML 实体…"
            />
          </div>
          <div className="grid-2" style={{ marginTop: '0.85rem' }}>
            <div className="field">
              <div className="panel-head" style={{ marginBottom: '0.4rem' }}>
                <label style={{ margin: 0 }}>编码结果</label>
                <button type="button" className="btn btn-ghost" onClick={() => void copy(htmlEncoded)}>
                  复制
                </button>
              </div>
              <textarea className="code-area unicode-area" value={htmlEncoded} readOnly spellCheck={false} />
            </div>
            <div className="field">
              <div className="panel-head" style={{ marginBottom: '0.4rem' }}>
                <label style={{ margin: 0 }}>解码结果</label>
                <button type="button" className="btn btn-ghost" onClick={() => void copy(htmlDecoded)}>
                  复制
                </button>
              </div>
              <textarea className="code-area unicode-area" value={htmlDecoded} readOnly spellCheck={false} />
            </div>
          </div>
          <p className="status-info" style={{ margin: '0.65rem 0 0' }}>
            对同一输入同时给出编码与解码：输入原文看编码，输入实体看解码。
          </p>
        </div>
      ) : null}

      {tab === 'escape' ? (
        <div className="panel">
          <div className="toolbar" style={{ marginBottom: '0.75rem' }}>
            <Select
              value={escStyle}
              onChange={(v) => setEscStyle(v as UnicodeEscapeStyle)}
              aria-label="转义风格"
              style={{ minWidth: 200 }}
              options={[
                { value: 'js', label: 'JS \\uXXXX' },
                { value: 'js-braced', label: 'JS \\u{…}' },
                { value: 'python', label: 'Python \\u / \\U' },
                { value: 'css', label: 'CSS \\hhhh' },
                { value: 'utf8-hex', label: 'UTF-8 字节 Hex' },
              ]}
            />
            <button type="button" className="btn btn-ghost" onClick={() => setEscIn(DEMO)}>
              示例
            </button>
            <button type="button" className="btn btn-danger" onClick={() => setEscIn('')}>
              清空
            </button>
          </div>
          <div className="field">
            <label>输入（原文或转义序列）</label>
            <textarea
              className="code-area unicode-area"
              value={escIn}
              onChange={(e) => setEscIn(e.target.value)}
              spellCheck={false}
            />
          </div>
          <div className="grid-2" style={{ marginTop: '0.85rem' }}>
            <div className="field">
              <div className="panel-head" style={{ marginBottom: '0.4rem' }}>
                <label style={{ margin: 0 }}>编码</label>
                <button type="button" className="btn btn-ghost" onClick={() => void copy(escEncoded)}>
                  复制
                </button>
              </div>
              <textarea className="code-area unicode-area" value={escEncoded} readOnly spellCheck={false} />
            </div>
            <div className="field">
              <div className="panel-head" style={{ marginBottom: '0.4rem' }}>
                <label style={{ margin: 0 }}>解码</label>
                <button type="button" className="btn btn-ghost" onClick={() => void copy(escDecoded)}>
                  复制
                </button>
              </div>
              <textarea className="code-area unicode-area" value={escDecoded} readOnly spellCheck={false} />
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'inspect' ? (
        <div className="panel">
          <div className="field">
            <label>待分析文本</label>
            <textarea
              className="code-area unicode-area"
              value={inspectIn}
              onChange={(e) => setInspectIn(e.target.value)}
              spellCheck={false}
              placeholder="粘贴任意字符…"
            />
          </div>
          <div className="unicode-stats">
            <span>
              码点 <strong>{stats.codePoints}</strong>
            </span>
            <span>
              UTF-16 单元 <strong>{stats.utf16}</strong>
            </span>
            <span>
              UTF-8 字节 <strong>{stats.utf8Bytes}</strong>
            </span>
          </div>
          {points.length === 0 ? (
            <p className="status-info">输入文本后显示每个码点的详细信息</p>
          ) : (
            <div className="unicode-table-wrap">
              <table className="unicode-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>字符</th>
                    <th>Unicode</th>
                    <th>十进制</th>
                    <th>UTF-8</th>
                    <th>UTF-16</th>
                    <th>HTML</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr key={`${p.index}-${p.codePoint}`}>
                      <td className="muted">{p.index}</td>
                      <td className="unicode-char">{p.char === ' ' ? '␠' : p.char === '\n' ? '⏎' : p.char === '\t' ? '⇥' : p.char === '\u00A0' ? '⍽' : p.char}</td>
                      <td className="mono">{p.unicode}</td>
                      <td className="mono">{p.decimal}</td>
                      <td className="mono">{p.utf8}</td>
                      <td className="mono">{p.utf16}</td>
                      <td className="mono">
                        {p.htmlName ?? p.htmlDec}
                      </td>
                      <td className="unicode-actions">
                        <button type="button" className="btn btn-ghost" onClick={() => void copy(p.unicode)}>
                          U+
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => void copy(p.htmlDec)}>
                          &#
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => void copy(p.char)}>
                          字
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {countCodePoints(inspectIn) > 400 ? (
            <p className="status-info" style={{ marginTop: '0.5rem' }}>
              仅展示前 400 个码点
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === 'named' ? (
        <div className="panel">
          <div className="field">
            <label>搜索命名实体</label>
            <input
              value={namedQ}
              onChange={(e) => setNamedQ(e.target.value)}
              placeholder="如 nbsp、版权、€"
              spellCheck={false}
            />
          </div>
          <div className="unicode-named-grid">
            {namedList.map((e) => (
              <button
                key={e.name}
                type="button"
                className="unicode-named-card"
                title="点击复制 &name;"
                onClick={() => void copy(`&${e.name};`)}
              >
                <span className="unicode-named-char">{e.char}</span>
                <span className="unicode-named-name">&{e.name};</span>
                <span className="unicode-named-desc">{e.desc}</span>
              </button>
            ))}
          </div>
          {namedList.length === 0 ? <p className="status-info">无匹配</p> : null}
        </div>
      ) : null}
    </ToolPage>
  )
}
