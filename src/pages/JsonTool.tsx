import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { JsonTree, tryParseJson } from '../components/JsonTree'
import { Select } from '../components/Select'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import { UiIcon } from '../components/ToolIcon'
import './JsonTool.css'

/** 右侧展示模式：树形（类 json.cn）/ 纯文本 */
type ViewMode = 'tree' | 'text'

/**
 * 递归按键名字典序排序对象键
 */
function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys)
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(obj).sort((a, b) => a.localeCompare(b))) {
      sorted[key] = sortObjectKeys(obj[key])
    }
    return sorted
  }
  return value
}

/**
 * JSON 工具（交互接近 json.cn）
 * - 左侧编辑，右侧树形可视化（展开/折叠 + 类型着色）
 * - 支持格式化、压缩、键排序、复制路径/值
 * 全部在浏览器内完成
 */
export function JsonTool() {
  const [input, setInput] = useState(
    '{\n  "name": "offline-tools",\n  "version": 1,\n  "features": ["json", "yaml", "base64"],\n  "meta": {\n    "offline": true,\n    "author": null\n  }\n}\n',
  )
  const [indent, setIndent] = useState(2)
  const [sortKeys, setSortKeys] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('tree')
  const [expandDepth, setExpandDepth] = useState(2)
  /** 树视图搜索关键词 */
  const [searchQuery, setSearchQuery] = useState('')
  /** 当前搜索命中数 */
  const [matchCount, setMatchCount] = useState(0)
  /** 有序匹配路径（深度优先） */
  const [matchPaths, setMatchPaths] = useState<string[]>([])
  /** 当前激活匹配序号 0-based */
  const [matchIndex, setMatchIndex] = useState(0)
  /** 可视化面板全屏 */
  const [viewerFullscreen, setViewerFullscreen] = useState(false)
  /** 格式化后的文本输出（文本视图 / 复制用） */
  const [formatted, setFormatted] = useState('')
  /** 解析后的数据（树视图） */
  const [treeData, setTreeData] = useState<unknown>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const { copy } = useCopyFeedback()

  const charCount = useMemo(() => input.length, [input])

  /**
   * 解析并可选排序；成功返回数据，失败写入 error
   */
  function parseInput(): unknown | null {
    const result = tryParseJson(input)
    if (!result.ok) {
      setError(result.error)
      setTreeData(null)
      setFormatted('')
      setStatus('')
      return null
    }
    let data = result.data
    if (sortKeys) {
      data = sortObjectKeys(data)
    }
    setError('')
    return data
  }

  /** 格式化并刷新树 + 文本 */
  function handleFormat() {
    const data = parseInput()
    if (data === null) return
    const text = JSON.stringify(data, null, indent)
    setFormatted(text)
    setTreeData(data)
    setStatus('已格式化')
  }

  /** 压缩为一行 */
  function handleMinify() {
    const data = parseInput()
    if (data === null) return
    const text = JSON.stringify(data)
    setFormatted(text)
    setTreeData(data)
    setInput(text)
    setStatus('已压缩')
  }

  /** 仅校验 */
  function handleValidate() {
    const data = parseInput()
    if (data === null) return
    setTreeData(data)
    setFormatted(JSON.stringify(data, null, indent))
    setStatus('✓ JSON 合法')
  }

  /** 输入变化时自动尝试解析（防抖感：立即解析，失败只显示错误不刷树） */
  useEffect(() => {
    if (!input.trim()) {
      setError('')
      setTreeData(null)
      setFormatted('')
      setStatus('')
      return
    }
    const result = tryParseJson(input)
    if (!result.ok) {
      setError(result.error)
      // 保留上一份合法树，避免打字过程中视图闪空；仅标红错误
      setStatus('')
      return
    }
    let data = result.data
    if (sortKeys) {
      data = sortObjectKeys(data)
    }
    setError('')
    setTreeData(data)
    setFormatted(JSON.stringify(data, null, indent))
  }, [input, indent, sortKeys])

  function handleClear() {
    setInput('')
    setFormatted('')
    setTreeData(null)
    setError('')
    setStatus('')
    setSearchQuery('')
    setMatchCount(0)
    setMatchPaths([])
    setMatchIndex(0)
  }

  /** 搜索词变化时回到第一条 */
  useEffect(() => {
    setMatchIndex(0)
  }, [searchQuery])

  /** 全屏：Esc 退出 + 锁定背景滚动 */
  useEffect(() => {
    if (!viewerFullscreen) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setViewerFullscreen(false)
      }
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [viewerFullscreen])

  function goMatch(delta: number) {
    if (matchCount <= 0) return
    setMatchIndex((prev) => {
      const next = (prev + delta) % matchCount
      return next < 0 ? next + matchCount : next
    })
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      goMatch(e.shiftKey ? -1 : 1)
      return
    }
    if (e.key === 'F3') {
      e.preventDefault()
      goMatch(e.shiftKey ? -1 : 1)
    }
  }

  /** 将格式化结果写回输入 */
  function handleApplyFormatted() {
    if (!formatted) return
    setInput(formatted)
    setStatus('已写回输入')
  }

  function handleExpandAll() {
    setExpandDepth(99)
  }

  function handleCollapseAll() {
    setExpandDepth(0)
  }

  return (
    <ToolPage
      title="JSON 工具"
      description="实时树形可视化、类型着色、展开折叠；点击键复制路径，点击值复制内容。纯本地处理。"
      badge="离线"
    >
      <div className="panel">
        <div className="toolbar">
          <Select
            value={String(indent)}
            onChange={(v) => setIndent(Number(v))}
            aria-label="缩进空格数"
            style={{ minWidth: 132 }}
            options={[
              { value: '2', label: '缩进 2 空格' },
              { value: '4', label: '缩进 4 空格' },
              { value: '1', label: '缩进 1 空格' },
            ]}
          />

          <label className="toolbar" style={{ gap: '0.35rem' }}>
            <input
              type="checkbox"
              checked={sortKeys}
              onChange={(e) => setSortKeys(e.target.checked)}
            />
            <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>按键名排序</span>
          </label>

          <button type="button" className="btn btn-primary" onClick={handleFormat}>
            格式化
          </button>
          <button type="button" className="btn" onClick={handleMinify}>
            压缩
          </button>
          <button type="button" className="btn" onClick={handleValidate}>
            校验
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleApplyFormatted} disabled={!formatted}>
            写回输入
          </button>
          <button type="button" className="btn btn-danger" onClick={handleClear}>
            清空
          </button>
        </div>
      </div>

      <div className="grid-2 json-split">
        <div className="panel json-input-panel">
          <div className="panel-head">
            <h2>输入</h2>
            <span className="status-info">{charCount} 字符</span>
          </div>
          <div className="field">
            <textarea
              className="code-area"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="粘贴 JSON 文本，右侧实时树形展示…"
              spellCheck={false}
            />
          </div>
          {error ? (
            <p className="status-error json-panel-status">{error}</p>
          ) : status ? (
            <p className="status-ok json-panel-status">{status}</p>
          ) : (
            <p className="status-info json-panel-status" aria-hidden>
              {'\u00a0'}
            </p>
          )}
        </div>

        <div
          className={`panel json-viewer-panel${viewerFullscreen ? ' is-fullscreen' : ''}`}
          role={viewerFullscreen ? 'dialog' : undefined}
          aria-modal={viewerFullscreen || undefined}
          aria-label={viewerFullscreen ? 'JSON 可视化（全屏）' : undefined}
        >
          <div className="panel-head">
            <h2>可视化{viewerFullscreen ? ' · 全屏' : ''}</h2>
            <div className="toolbar">
              <div className="view-tabs" role="tablist" aria-label="视图切换">
                <button
                  type="button"
                  role="tab"
                  className={`view-tab${viewMode === 'tree' ? ' active' : ''}`}
                  aria-selected={viewMode === 'tree'}
                  onClick={() => setViewMode('tree')}
                >
                  树形
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`view-tab${viewMode === 'text' ? ' active' : ''}`}
                  aria-selected={viewMode === 'text'}
                  onClick={() => setViewMode('text')}
                >
                  文本
                </button>
              </div>
              {viewMode === 'tree' ? (
                <>
                  <button type="button" className="btn btn-ghost" onClick={handleExpandAll}>
                    全部展开
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={handleCollapseAll}>
                    全部折叠
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => copy(formatted)}
                disabled={!formatted}
              >
                复制 JSON
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setViewerFullscreen((v) => !v)}
                title={viewerFullscreen ? '退出全屏（Esc）' : '全屏可视化'}
                aria-label={viewerFullscreen ? '退出全屏' : '全屏可视化'}
                aria-pressed={viewerFullscreen}
              >
                <UiIcon name={viewerFullscreen ? 'minimize' : 'maximize'} size={16} strokeWidth={2.1} />
                <span className="json-fs-btn-label">{viewerFullscreen ? '退出' : '全屏'}</span>
              </button>
            </div>
          </div>

          {viewMode === 'tree' && treeData !== null && !error ? (
            <div className="json-search-bar">
              <input
                type="search"
                className="json-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="搜索键名、路径或值… Enter 下一个 / Shift+Enter 上一个"
                aria-label="搜索 JSON"
              />
              {searchQuery.trim() ? (
                <>
                  <span className="json-search-count">
                    {matchCount > 0
                      ? `${Math.min(matchIndex, matchCount - 1) + 1} / ${matchCount}`
                      : '无匹配'}
                  </span>
                  <div className="json-search-nav">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => goMatch(-1)}
                      disabled={matchCount <= 0}
                      title="上一个（Shift+Enter）"
                      aria-label="上一个匹配"
                    >
                      <UiIcon name="chevron-up" size={16} strokeWidth={2.2} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => goMatch(1)}
                      disabled={matchCount <= 0}
                      title="下一个（Enter）"
                      aria-label="下一个匹配"
                    >
                      <UiIcon name="chevron-down" size={16} strokeWidth={2.2} />
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {treeData !== null && !error ? (
            viewMode === 'tree' ? (
              <JsonTree
                key={expandDepth}
                data={treeData}
                defaultExpandDepth={expandDepth}
                searchQuery={searchQuery}
                activeMatchIndex={matchIndex}
                onSearchMatchCount={setMatchCount}
                onSearchMatches={setMatchPaths}
                onCopyPath={(p) => {
                  void copy(p)
                }}
                onCopyValue={(v) => {
                  void copy(v)
                }}
              />
            ) : (
              <pre className="json-raw-view">{formatted}</pre>
            )
          ) : (
            <div className="json-tree" style={{ display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
              {error ? 'JSON 无效，请修正左侧输入' : '粘贴合法 JSON 后在此展示树形结构'}
            </div>
          )}

          <p className="status-info" style={{ margin: 0 }}>
            提示：树形模式下可搜索键/值，用 ↑↓ 或 Enter / Shift+Enter 在匹配间跳转；点击
            <strong>键名</strong>复制路径，点击<strong>值</strong>复制内容。
            {matchPaths.length > 0 && searchQuery.trim()
              ? ` 当前：${matchPaths[Math.min(matchIndex, matchPaths.length - 1)]}`
              : ''}
          </p>
        </div>
      </div>
    </ToolPage>
  )
}
