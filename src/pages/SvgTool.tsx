import { useMemo, useState } from 'react'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'

const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <!-- demo -->
  <rect x="10" y="10" width="100" height="100" rx="16" fill="#38bdf8" fill-opacity="0.9"/>
  <circle cx="60" cy="60" r="28" fill="#818cf8" />
  <text x="60" y="66" text-anchor="middle" font-size="14" fill="#0f172a" font-family="sans-serif">SVG</text>
</svg>
`

/**
 * 轻量 SVG 优化：去注释、多余空白、可选去 metadata 等
 * （非完整 SVGO，覆盖日常清理场景）
 */
function optimizeSvg(
  input: string,
  opts: {
    stripComments: boolean
    collapseWhitespace: boolean
    stripMetadata: boolean
    stripXmlnsXlink: boolean
  },
): string {
  let s = input.trim()
  if (!s) return ''

  if (opts.stripComments) {
    s = s.replace(/<!--[\s\S]*?-->/g, '')
  }
  if (opts.stripMetadata) {
    s = s.replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
    s = s.replace(/<title[\s\S]*?<\/title>/gi, '')
    s = s.replace(/<desc[\s\S]*?<\/desc>/gi, '')
  }
  if (opts.stripXmlnsXlink) {
    // 无 xlink: 引用时去掉多余命名空间
    if (!/xlink:/i.test(s)) {
      s = s.replace(/\s+xmlns:xlink="[^"]*"/gi, '')
    }
  }
  if (opts.collapseWhitespace) {
    // 标签之间空白压缩；保留文本节点内部单个空格
    s = s
      .replace(/>\s+</g, '><')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([/>])/g, '$1')
      .replace(/\s+>/g, '>')
      .trim()
  }
  return s
}

/**
 * SVG 优化预览工具
 */
export function SvgTool() {
  const [input, setInput] = useState(DEFAULT_SVG)
  const [stripComments, setStripComments] = useState(true)
  const [collapseWhitespace, setCollapseWhitespace] = useState(true)
  const [stripMetadata, setStripMetadata] = useState(true)
  const [stripXmlnsXlink, setStripXmlnsXlink] = useState(true)
  const { copy } = useCopyFeedback()

  const output = useMemo(
    () =>
      optimizeSvg(input, {
        stripComments,
        collapseWhitespace,
        stripMetadata,
        stripXmlnsXlink,
      }),
    [input, stripComments, collapseWhitespace, stripMetadata, stripXmlnsXlink],
  )

  const inBytes = useMemo(() => new TextEncoder().encode(input).length, [input])
  const outBytes = useMemo(() => new TextEncoder().encode(output).length, [output])
  const saved = inBytes > 0 ? (((inBytes - outBytes) / inBytes) * 100).toFixed(1) : '0'

  function handleDownload() {
    if (!output) return
    const blob = new Blob([output], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'optimized.svg'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <ToolPage
      title="SVG 优化"
      description="清理注释、元数据与多余空白，实时预览并导出。轻量本地优化，非完整 SVGO。"
      badge="离线"
    >
      <div className="panel">
        <div className="toolbar">
          <label className="toolbar" style={{ gap: '0.35rem' }}>
            <input type="checkbox" checked={stripComments} onChange={(e) => setStripComments(e.target.checked)} />
            <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>去注释</span>
          </label>
          <label className="toolbar" style={{ gap: '0.35rem' }}>
            <input
              type="checkbox"
              checked={collapseWhitespace}
              onChange={(e) => setCollapseWhitespace(e.target.checked)}
            />
            <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>压缩空白</span>
          </label>
          <label className="toolbar" style={{ gap: '0.35rem' }}>
            <input type="checkbox" checked={stripMetadata} onChange={(e) => setStripMetadata(e.target.checked)} />
            <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>去 metadata/title/desc</span>
          </label>
          <label className="toolbar" style={{ gap: '0.35rem' }}>
            <input
              type="checkbox"
              checked={stripXmlnsXlink}
              onChange={(e) => setStripXmlnsXlink(e.target.checked)}
            />
            <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>清理无用 xmlns:xlink</span>
          </label>
          <button type="button" className="btn" onClick={() => void copy(output)} disabled={!output}>
            复制结果
          </button>
          <button type="button" className="btn" onClick={handleDownload} disabled={!output}>
            下载 SVG
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setInput(DEFAULT_SVG)}>
            示例
          </button>
          <button type="button" className="btn btn-danger" onClick={() => setInput('')}>
            清空
          </button>
        </div>
        <p className="status-info" style={{ margin: '0.75rem 0 0' }}>
          {inBytes} → {outBytes} 字节（约减 {saved}%）
        </p>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>输入 SVG</h2>
          </div>
          <div className="field">
            <textarea
              className="code-area"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="粘贴 SVG 源码…"
              spellCheck={false}
            />
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <h2>优化结果</h2>
          </div>
          <div className="field">
            <textarea className="code-area" value={output} readOnly spellCheck={false} />
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>原图预览</h2>
          </div>
          <div
            style={{
              minHeight: 160,
              display: 'grid',
              placeItems: 'center',
              background: 'repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 16px 16px',
              borderRadius: '0.7rem',
              border: '1px solid var(--border)',
              padding: '1rem',
            }}
            dangerouslySetInnerHTML={{ __html: input || '<span style="color:#64748b">无内容</span>' }}
          />
        </div>
        <div className="panel">
          <div className="panel-head">
            <h2>优化后预览</h2>
          </div>
          <div
            style={{
              minHeight: 160,
              display: 'grid',
              placeItems: 'center',
              background: 'repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 16px 16px',
              borderRadius: '0.7rem',
              border: '1px solid var(--border)',
              padding: '1rem',
            }}
            dangerouslySetInnerHTML={{ __html: output || '<span style="color:#64748b">无内容</span>' }}
          />
        </div>
      </div>
    </ToolPage>
  )
}
