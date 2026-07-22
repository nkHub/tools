import { useMemo, useState } from 'react'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import { EXT_TO_MIME, extractExt, searchMime } from '../utils/mime-db'

/**
 * MIME 类型查询工具
 * 扩展名 ↔ MIME 双向查找，支持模糊搜索
 */
export function MimeTool() {
  const [query, setQuery] = useState('png')
  const { copy } = useCopyFeedback()

  const exactExt = useMemo(() => extractExt(query), [query])
  const exactMime = exactExt ? EXT_TO_MIME[exactExt] : undefined

  const list = useMemo(() => searchMime(query), [query])

  return (
    <ToolPage
      title="MIME 类型"
      description="扩展名与 MIME Type 互查。纯前端常见类型表，适合开发调试。"
      badge="离线"
    >
      <div className="panel">
        <div className="field">
          <label>搜索（扩展名 / 文件名 / MIME）</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例如 png、image/png、photo.jpg"
            spellCheck={false}
          />
        </div>

        {exactMime ? (
          <div className="field" style={{ marginTop: '0.75rem' }}>
            <label>精确匹配：.{exactExt}</label>
            <div className="toolbar">
              <input readOnly value={exactMime} style={{ flex: 1 }} />
              <button type="button" className="btn btn-ghost" onClick={() => void copy(exactMime)}>
                复制 MIME
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => void copy(exactExt)}
              >
                复制扩展名
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="panel" style={{ marginTop: '1rem' }}>
        <div className="panel-head">
          <h2>结果（{list.length}）</h2>
        </div>
        {list.length === 0 ? (
          <p className="hint">无匹配项</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                    扩展名
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                    MIME Type
                  </th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map(({ ext, mime }) => (
                  <tr key={ext}>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                      .{ext}
                    </td>
                    <td
                      style={{
                        padding: '0.5rem',
                        borderBottom: '1px solid var(--border)',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '0.85rem',
                      }}
                    >
                      {mime}
                    </td>
                    <td
                      style={{
                        padding: '0.5rem',
                        borderBottom: '1px solid var(--border)',
                        textAlign: 'right',
                      }}
                    >
                      <button type="button" className="btn btn-ghost" onClick={() => void copy(mime)}>
                        复制
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ToolPage>
  )
}
