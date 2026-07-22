import { useMemo, useState } from 'react'
import { marked } from 'marked'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import './MarkdownTool.css'

/** 目录条目 */
interface TocItem {
  /** 标题层级 1–6 */
  level: number
  /** 标题文本 */
  text: string
  /** 锚点 id */
  id: string
}

/** 默认示例 Markdown */
const DEFAULT_MD = `# Markdown 预览

实时渲染与目录提取，全部在浏览器本地完成。

## 功能

- 实时预览
- 目录（TOC）提取
- 一键复制 HTML / 目录

### 代码示例

\`\`\`ts
const hello = 'world'
console.log(hello)
\`\`\`

## 列表

1. 有序
2. 项目
- 无序
- 项目

> 引用块也支持。

| 列 A | 列 B |
| ---- | ---- |
| 1    | 2    |
`

/**
 * 将标题文本转为稳定 slug（用于锚点）
 */
function slugify(text: string, used: Map<string, number>): string {
  let base = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s\-_]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (!base) base = 'heading'
  const n = used.get(base) ?? 0
  used.set(base, n + 1)
  return n === 0 ? base : `${base}-${n}`
}

/**
 * 从 Markdown 源码提取 ATX 标题目录
 */
function extractToc(md: string): TocItem[] {
  const used = new Map<string, number>()
  const items: TocItem[] = []
  const lines = md.split(/\r?\n/)
  // 简单跳过 fenced code block
  let inFence = false
  for (const line of lines) {
    if (/^(`{3,}|~{3,})/.test(line.trim())) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (!m) continue
    const level = m[1].length
    // 去掉行内简单标记
    const text = m[2].replace(/[*_`~[\]]/g, '').trim()
    if (!text) continue
    items.push({ level, text, id: slugify(text, used) })
  }
  return items
}

/**
 * 渲染 Markdown 为 HTML，再按 TOC 顺序给 h1–h6 注入 id
 */
function renderMarkdown(md: string, toc: TocItem[]): string {
  const html = marked.parse(md, { gfm: true, breaks: false }) as string
  let i = 0
  return html.replace(/<h([1-6])(\s[^>]*)?>/gi, (full, level: string, attrs = '') => {
    const item = toc[i]
    i += 1
    if (!item || item.level !== Number(level)) {
      // TOC 与 HTML 标题不对齐时仍生成兜底 id
      return full.includes('id=') ? full : `<h${level}${attrs} id="heading-${i}">`
    }
    if (/\sid=/.test(attrs)) {
      return `<h${level}${attrs.replace(/\sid="[^"]*"/, ` id="${item.id}"`)}>`
    }
    return `<h${level}${attrs} id="${item.id}">`
  })
}

/**
 * Markdown 预览 + 目录提取工具
 */
export function MarkdownTool() {
  const [input, setInput] = useState(DEFAULT_MD)
  const { copy } = useCopyFeedback()

  const toc = useMemo(() => extractToc(input), [input])

  const html = useMemo(() => {
    try {
      return renderMarkdown(input, toc)
    } catch (e) {
      return `<p class="status-error">${e instanceof Error ? e.message : '渲染失败'}</p>`
    }
  }, [input, toc])

  const tocMarkdown = useMemo(() => {
    return toc
      .map((t) => `${'  '.repeat(Math.max(0, t.level - 1))}- [${t.text}](#${t.id})`)
      .join('\n')
  }, [toc])

  return (
    <ToolPage
      title="Markdown 预览"
      description="实时预览 Markdown，提取标题目录（TOC），支持复制 HTML 与目录列表。纯本地处理。"
      badge="离线"
    >
      <div className="panel">
        <div className="toolbar">
          <button type="button" className="btn btn-primary" onClick={() => void copy(html)}>
            复制 HTML
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void copy(tocMarkdown)}
            disabled={!toc.length}
          >
            复制目录
          </button>
          <button type="button" className="btn btn-danger" onClick={() => setInput('')}>
            清空
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setInput(DEFAULT_MD)}>
            示例
          </button>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>输入</h2>
            <span className="status-info">{input.length} 字符</span>
          </div>
          <div className="field">
            <textarea
              className="code-area"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入 Markdown…"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="panel md-preview-panel">
          <div className="panel-head">
            <h2>预览</h2>
          </div>
          <div className="md-preview" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>目录（TOC）</h2>
          <span className="status-info">{toc.length} 个标题</span>
        </div>
        {toc.length === 0 ? (
          <p className="status-info" style={{ margin: 0 }}>
            未检测到标题（使用 # 一级标题 等 ATX 语法）
          </p>
        ) : (
          <ul className="md-toc">
            {toc.map((t) => (
              <li key={t.id} style={{ paddingLeft: `${(t.level - 1) * 0.85}rem` }}>
                <a href={`#${t.id}`} className="md-toc-link">
                  <span className="md-toc-level">H{t.level}</span>
                  {t.text}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ToolPage>
  )
}
