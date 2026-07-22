import { useMemo, useState, type ReactNode } from 'react'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import './RegexTool.css'

interface MatchInfo {
  index: number
  match: string
  groups: string[]
  named?: Record<string, string>
}

/**
 * 编译正则；flags 去重并强制包含 g 以便全局 exec
 */
function buildRegex(pattern: string, flags: string): { re: RegExp | null; error: string } {
  if (!pattern) return { re: null, error: '' }
  try {
    const clean = [...new Set(flags.replace(/\s/g, '').split(''))]
      .filter((f) => 'gimsuy'.includes(f))
      .join('')
    // 匹配列表需要 g；保留用户选择的其它标志
    const finalFlags = clean.includes('g') ? clean : `${clean}g`
    return { re: new RegExp(pattern, finalFlags), error: '' }
  } catch (e) {
    return { re: null, error: e instanceof Error ? e.message : '正则无效' }
  }
}

/**
 * 执行全局匹配，收集捕获组
 */
function collectMatches(re: RegExp, text: string): MatchInfo[] {
  const list: MatchInfo[] = []
  re.lastIndex = 0
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = re.exec(text)) !== null) {
    list.push({
      index: m.index,
      match: m[0],
      groups: m.slice(1),
      named: m.groups as Record<string, string> | undefined,
    })
    // 避免零宽匹配死循环
    if (m[0].length === 0) {
      re.lastIndex += 1
    }
    guard += 1
    if (guard > 5000) break
  }
  return list
}

/**
 * 将匹配片段高亮为 React 节点
 */
function highlightText(text: string, matches: MatchInfo[]) {
  if (!matches.length) return text
  const nodes: ReactNode[] = []
  let cursor = 0
  matches.forEach((m, i) => {
    if (m.index > cursor) {
      nodes.push(text.slice(cursor, m.index))
    }
    nodes.push(
      <mark key={`${m.index}-${i}`} className="regex-mark">
        {m.match || '∅'}
      </mark>,
    )
    cursor = m.index + m.match.length
  })
  if (cursor < text.length) {
    nodes.push(text.slice(cursor))
  }
  return nodes
}

/**
 * 正则表达式测试工具：匹配、捕获组、替换
 */
export function RegexTool() {
  const [pattern, setPattern] = useState('\\b\\w+@\\w+\\.\\w+\\b')
  const [flags, setFlags] = useState('g')
  const [text, setText] = useState(
    '联系我：alice@example.com 或 bob@test.org\n电话可忽略，只测邮箱。',
  )
  const [replacement, setReplacement] = useState('[$&]')
  const { copy } = useCopyFeedback()

  const compiled = useMemo(() => buildRegex(pattern, flags), [pattern, flags])

  const matches = useMemo(() => {
    if (!compiled.re || !text) return [] as MatchInfo[]
    return collectMatches(compiled.re, text)
  }, [compiled.re, text])

  const replaced = useMemo(() => {
    if (!compiled.re) return ''
    try {
      // replace 使用不强制 g 的版本会更符合用户 flags；此处用同一 re
      const re = new RegExp(
        compiled.re.source,
        flags.includes('g') ? compiled.re.flags : compiled.re.flags.replace('g', ''),
      )
      return text.replace(re, replacement)
    } catch {
      return ''
    }
  }, [compiled.re, text, replacement, flags])

  function toggleFlag(f: string) {
    setFlags((prev) => (prev.includes(f) ? prev.replace(f, '') : `${prev}${f}`))
  }

  return (
    <ToolPage
      title="正则表达式测试"
      description="编写正则并实时匹配文本，查看捕获组与替换结果。全部在浏览器本地运行。"
      badge="离线"
    >
      <div className="panel">
        <div className="regex-pattern-row">
          <span className="regex-slash">/</span>
          <input
            className="regex-pattern-input"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="正则表达式"
            spellCheck={false}
            aria-label="正则表达式"
          />
          <span className="regex-slash">/</span>
          <input
            className="regex-flags-input"
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            placeholder="flags"
            spellCheck={false}
            aria-label="标志"
          />
        </div>
        <div className="toolbar" style={{ marginTop: '0.65rem' }}>
          {(['g', 'i', 'm', 's', 'u', 'y'] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={`btn ${flags.includes(f) ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => toggleFlag(f)}
              title={
                {
                  g: '全局',
                  i: '忽略大小写',
                  m: '多行',
                  s: 'dotAll',
                  u: 'Unicode',
                  y: '粘性',
                }[f]
              }
            >
              {f}
            </button>
          ))}
          <span className="status-info" style={{ marginLeft: '0.35rem' }}>
            {compiled.error
              ? ''
              : compiled.re
                ? `匹配 ${matches.length} 处`
                : '请输入正则'}
          </span>
        </div>
        {compiled.error ? (
          <p className="status-error" style={{ marginTop: '0.55rem' }}>
            {compiled.error}
          </p>
        ) : null}
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>测试文本</h2>
          </div>
          <div className="field">
            <textarea
              className="code-area"
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
            />
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <h2>高亮预览</h2>
          </div>
          <div className="regex-highlight">
            {text ? highlightText(text, matches) : <span className="status-info">暂无文本</span>}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>匹配结果</h2>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => copy(matches.map((m) => m.match).join('\n'))}
            disabled={!matches.length}
          >
            复制匹配文本
          </button>
        </div>
        {matches.length === 0 ? (
          <p className="status-info">无匹配</p>
        ) : (
          <dl className="kv-list">
            {matches.map((m, i) => (
              <div className="kv-item" key={`${m.index}-${i}`}>
                <dt>
                  #{i + 1}
                  <small className="regex-meta">@ {m.index}</small>
                </dt>
                <dd>
                  <div>{m.match || '(空匹配)'}</div>
                  {m.groups.length > 0 ? (
                    <div className="regex-groups">
                      捕获组：{m.groups.map((g, gi) => `$${gi + 1}=${JSON.stringify(g)}`).join(' · ')}
                    </div>
                  ) : null}
                  {m.named && Object.keys(m.named).length > 0 ? (
                    <div className="regex-groups">
                      命名组：
                      {Object.entries(m.named)
                        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                        .join(' · ')}
                    </div>
                  ) : null}
                </dd>
                <button type="button" className="btn btn-ghost" onClick={() => copy(m.match)}>
                  复制
                </button>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>替换</h2>
          <button type="button" className="btn btn-ghost" onClick={() => copy(replaced)} disabled={!replaced}>
            复制结果
          </button>
        </div>
        <div className="field">
          <label>替换模板（可用 $&amp;、$1、$$ 等）</label>
          <input
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            spellCheck={false}
          />
        </div>
        <div className="field" style={{ marginTop: '0.75rem' }}>
          <label>替换结果</label>
          <textarea className="code-area" value={replaced} readOnly spellCheck={false} />
        </div>
      </div>
    </ToolPage>
  )
}
