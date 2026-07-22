import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { UiIcon } from './ToolIcon'
import './JsonTree.css'

/**
 * 仅在 scrollRoot 内部滚动，使 target 尽量垂直居中；不触发页面滚动
 */
function scrollIntoContainer(
  scrollRoot: HTMLElement,
  target: HTMLElement,
  behavior: ScrollBehavior = 'smooth',
) {
  const rootRect = scrollRoot.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const targetCenter =
    targetRect.top - rootRect.top + scrollRoot.scrollTop + targetRect.height / 2
  const nextTop = Math.max(0, targetCenter - scrollRoot.clientHeight / 2)
  const maxTop = Math.max(0, scrollRoot.scrollHeight - scrollRoot.clientHeight)
  scrollRoot.scrollTo({
    top: Math.min(nextTop, maxTop),
    behavior,
  })
}

/** 树节点路径，用点号/下标描述，如 a.b[0].c */
type JsonPath = (string | number)[]

interface JsonTreeProps {
  /** 已解析的 JSON 数据 */
  data: unknown
  /** 默认展开层级（0=只展开根，1=展开一层…） */
  defaultExpandDepth?: number
  /** 搜索关键词：匹配键名 / 路径 / 原始值（不区分大小写） */
  searchQuery?: string
  /** 当前激活的匹配序号（0-based），用于上一个/下一个跳转 */
  activeMatchIndex?: number
  /** 点击路径或值时的回调（可选） */
  onCopyPath?: (path: string) => void
  onCopyValue?: (value: string) => void
  /** 匹配结果数量变化时回调 */
  onSearchMatchCount?: (count: number) => void
  /** 有序匹配路径列表（深度优先），便于上一个/下一个导航 */
  onSearchMatches?: (paths: string[]) => void
}

/**
 * 将路径数组格式化为可读字符串
 * 例：['user', 0, 'name'] → user[0].name
 */
function formatPath(path: JsonPath): string {
  if (path.length === 0) return '$'
  let s = ''
  for (const seg of path) {
    if (typeof seg === 'number') {
      s += `[${seg}]`
    } else if (/^[A-Za-z_$][\w$]*$/.test(seg)) {
      s += s ? `.${seg}` : seg
    } else {
      s += s ? `["${seg.replace(/"/g, '\\"')}"]` : `["${seg.replace(/"/g, '\\"')}"]`
    }
  }
  return s || '$'
}

/** 值的简短预览（折叠时显示） */
function previewValue(value: unknown, maxLen = 48): string {
  if (value === null) return 'null'
  if (typeof value === 'string') {
    const t = JSON.stringify(value)
    return t.length > maxLen ? `${t.slice(0, maxLen)}…` : t
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `Array(${value.length})`
  if (typeof value === 'object') {
    const keys = Object.keys(value as object)
    return `Object{${keys.length}}`
  }
  return String(value)
}

/**
 * 判断原始值文本是否匹配关键词
 */
function valueMatches(value: unknown, q: string): boolean {
  if (!q) return false
  if (value === null) return 'null'.includes(q)
  if (typeof value === 'string') return value.toLowerCase().includes(q)
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).toLowerCase().includes(q)
  }
  return false
}

/**
 * 判断键名是否匹配
 */
function keyMatches(name: string | number | undefined, q: string): boolean {
  if (!q || name === undefined) return false
  return String(name).toLowerCase().includes(q)
}

/**
 * 深度优先收集所有匹配节点的有序路径列表，
 * 同时收集需要强制展开的祖先路径（便于自动展开到匹配项）
 */
function collectSearchHits(
  value: unknown,
  path: JsonPath,
  q: string,
  hitList: string[],
  hitSet: Set<string>,
  expandPaths: Set<string>,
  name?: string | number,
): void {
  if (!q) return

  const pathStr = formatPath(path)
  const selfHit = keyMatches(name, q) || valueMatches(value, q) || pathStr.toLowerCase().includes(q)

  if (selfHit && !hitSet.has(pathStr)) {
    hitSet.add(pathStr)
    hitList.push(pathStr)
    // 祖先路径都需要展开
    for (let i = 0; i < path.length; i++) {
      expandPaths.add(formatPath(path.slice(0, i)))
    }
  }

  if (value !== null && typeof value === 'object') {
    if (Array.isArray(value)) {
      value.forEach((child, i) => {
        collectSearchHits(child, [...path, i], q, hitList, hitSet, expandPaths, i)
      })
    } else {
      for (const [k, child] of Object.entries(value as Record<string, unknown>)) {
        collectSearchHits(child, [...path, k], q, hitList, hitSet, expandPaths, k)
      }
    }
  }
}

interface NodeProps {
  name?: string | number
  value: unknown
  path: JsonPath
  depth: number
  defaultExpandDepth: number
  /** 规范化后的搜索词（小写） */
  searchQuery: string
  /** 命中的路径集合 */
  hitPaths: Set<string>
  /** 当前激活匹配的路径（上一个/下一个） */
  activePath: string | null
  /** 需要强制展开的路径集合 */
  expandPaths: Set<string>
  onCopyPath?: (path: string) => void
  onCopyValue?: (value: string) => void
}

/**
 * 单个 JSON 树节点：支持展开/折叠、类型着色、复制路径/值、搜索高亮
 */
function JsonNode({
  name,
  value,
  path,
  depth,
  defaultExpandDepth,
  searchQuery,
  hitPaths,
  activePath,
  expandPaths,
  onCopyPath,
  onCopyValue,
}: NodeProps) {
  const isObject = value !== null && typeof value === 'object'
  const isArray = Array.isArray(value)
  const entries = useMemo(() => {
    if (!isObject) return [] as [string | number, unknown][]
    if (isArray) {
      return (value as unknown[]).map((v, i) => [i, v] as [number, unknown])
    }
    return Object.entries(value as Record<string, unknown>)
  }, [value, isObject, isArray])

  const pathStr = formatPath(path)
  const hasChildren = isObject && entries.length > 0
  const isEmpty = isObject && entries.length === 0
  const isHit = hitPaths.has(pathStr)
  const isActive = Boolean(activePath && activePath === pathStr)
  const forceExpand =
    expandPaths.has(pathStr) ||
    (searchQuery.length > 0 && isHit && hasChildren) ||
    (isActive && hasChildren)

  const [expanded, setExpanded] = useState(depth < defaultExpandDepth || forceExpand)

  // 搜索词或命中集合变化时，同步强制展开状态
  useEffect(() => {
    if (forceExpand) {
      setExpanded(true)
    }
  }, [forceExpand, searchQuery, isActive])

  // 全部展开/折叠（defaultExpandDepth 变化）时重置
  useEffect(() => {
    setExpanded(depth < defaultExpandDepth || forceExpand)
  }, [defaultExpandDepth, depth, forceExpand])

  const toggle = useCallback(() => {
    if (hasChildren) setExpanded((e) => !e)
  }, [hasChildren])

  /** 渲染原始类型（string / number / boolean / null） */
  function renderPrimitive(v: unknown) {
    if (v === null) return <span className="jt-null">null</span>
    if (typeof v === 'boolean') return <span className="jt-bool">{String(v)}</span>
    if (typeof v === 'number') return <span className="jt-number">{String(v)}</span>
    if (typeof v === 'string') return <span className="jt-string">{JSON.stringify(v)}</span>
    return <span className="jt-unknown">{String(v)}</span>
  }

  const lineClass = `jt-line${isHit ? ' jt-hit' : ''}${isActive ? ' jt-hit-active' : ''}`

  const keyLabel =
    name === undefined ? null : (
      <span
        className={`jt-key${keyMatches(name, searchQuery) ? ' jt-match' : ''}`}
        title={`路径: ${pathStr}`}
        onClick={(e) => {
          e.stopPropagation()
          onCopyPath?.(pathStr)
        }}
      >
        {typeof name === 'number' ? (
          <span className="jt-index">{name}</span>
        ) : (
          JSON.stringify(name)
        )}
      </span>
    )

  // 折叠时的摘要行
  if (isObject && !expanded) {
    return (
      <div className={lineClass} style={{ paddingLeft: depth * 14 }} data-path={pathStr}>
        {hasChildren ? (
          <button type="button" className="jt-toggle" onClick={toggle} aria-label="展开">
            <UiIcon name="chevron-right" size={12} strokeWidth={2.4} />
          </button>
        ) : (
          <span className="jt-toggle-placeholder" />
        )}
        {keyLabel}
        {keyLabel ? <span className="jt-colon">: </span> : null}
        <span
          className="jt-preview"
          onClick={toggle}
          title={hasChildren ? '点击展开' : undefined}
        >
          {isArray ? (
            <>
              <span className="jt-bracket">[</span>
              {isEmpty ? null : <span className="jt-ellipsis">…{entries.length}…</span>}
              <span className="jt-bracket">]</span>
            </>
          ) : (
            <>
              <span className="jt-bracket">{'{'}</span>
              {isEmpty ? null : <span className="jt-ellipsis">…{entries.length}…</span>}
              <span className="jt-bracket">{'}'}</span>
            </>
          )}
          <span className="jt-type-hint">{previewValue(value)}</span>
        </span>
      </div>
    )
  }

  // 原始值
  if (!isObject) {
    return (
      <div className={lineClass} style={{ paddingLeft: depth * 14 }} data-path={pathStr}>
        <span className="jt-toggle-placeholder" />
        {keyLabel}
        {keyLabel ? <span className="jt-colon">: </span> : null}
        <span
          className={`jt-value${valueMatches(value, searchQuery) ? ' jt-match' : ''}`}
          title="点击复制值"
          onClick={() => {
            try {
              onCopyValue?.(
                typeof value === 'string' ? value : JSON.stringify(value),
              )
            } catch {
              onCopyValue?.(String(value))
            }
          }}
        >
          {renderPrimitive(value)}
        </span>
      </div>
    )
  }

  // 展开的对象 / 数组
  return (
    <div className="jt-block">
      <div className={lineClass} style={{ paddingLeft: depth * 14 }} data-path={pathStr}>
        {hasChildren ? (
          <button type="button" className="jt-toggle" onClick={toggle} aria-label="折叠">
            <UiIcon name="chevron-down" size={12} strokeWidth={2.4} />
          </button>
        ) : (
          <span className="jt-toggle-placeholder" />
        )}
        {keyLabel}
        {keyLabel ? <span className="jt-colon">: </span> : null}
        <span className="jt-bracket">{isArray ? '[' : '{'}</span>
        {isEmpty ? <span className="jt-bracket">{isArray ? ']' : '}'}</span> : null}
      </div>

      {expanded &&
        entries.map(([k, v]) => (
          <JsonNode
            key={`${pathStr}.${String(k)}`}
            name={k}
            value={v}
            path={[...path, k]}
            depth={depth + 1}
            defaultExpandDepth={defaultExpandDepth}
            searchQuery={searchQuery}
            hitPaths={hitPaths}
            activePath={activePath}
            expandPaths={expandPaths}
            onCopyPath={onCopyPath}
            onCopyValue={onCopyValue}
          />
        ))}

      {!isEmpty && expanded ? (
        <div className="jt-line" style={{ paddingLeft: depth * 14 }}>
          <span className="jt-toggle-placeholder" />
          <span className="jt-bracket">{isArray ? ']' : '}'}</span>
        </div>
      ) : null}
    </div>
  )
}

/**
 * JSON 树形可视化（风格接近 json.cn）
 * - 键/字符串/数字/布尔/null 分色
 * - 节点展开折叠
 * - 点击键复制路径，点击值复制内容
 * - 支持键名/路径/值搜索高亮，并自动展开到命中节点
 */
export function JsonTree({
  data,
  defaultExpandDepth = 2,
  searchQuery = '',
  activeMatchIndex = 0,
  onCopyPath,
  onCopyValue,
  onSearchMatchCount,
  onSearchMatches,
}: JsonTreeProps) {
  const q = searchQuery.trim().toLowerCase()

  const { hitList, hitPaths, expandPaths } = useMemo(() => {
    const list: string[] = []
    const set = new Set<string>()
    const expand = new Set<string>()
    if (q) {
      collectSearchHits(data, [], q, list, set, expand)
    }
    return { hitList: list, hitPaths: set, expandPaths: expand }
  }, [data, q])

  useEffect(() => {
    onSearchMatchCount?.(hitList.length)
    onSearchMatches?.(hitList)
  }, [hitList, onSearchMatchCount, onSearchMatches])

  const activePath =
    hitList.length > 0
      ? hitList[((activeMatchIndex % hitList.length) + hitList.length) % hitList.length] ?? null
      : null

  const treeRef = useRef<HTMLDivElement>(null)

  // 仅在树容器内滚动到当前激活匹配，避免带动整页
  useEffect(() => {
    if (!q || !activePath) return
    const root = treeRef.current
    if (!root) return

    let cancelled = false
    let raf2 = 0
    // 双 rAF：等 forceExpand 展开节点完成布局后再量位置
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        if (cancelled) return
        const el = root.querySelector(`[data-path="${CSS.escape(activePath)}"]`)
        if (el instanceof HTMLElement) {
          scrollIntoContainer(root, el, 'smooth')
        }
      })
    })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf1)
      window.cancelAnimationFrame(raf2)
    }
  }, [q, activePath, activeMatchIndex])

  return (
    <div ref={treeRef} className="json-tree" role="tree" aria-label="JSON 树形视图">
      <JsonNode
        value={data}
        path={[]}
        depth={0}
        defaultExpandDepth={defaultExpandDepth}
        searchQuery={q}
        hitPaths={hitPaths}
        activePath={activePath}
        expandPaths={expandPaths}
        onCopyPath={onCopyPath}
        onCopyValue={onCopyValue}
      />
    </div>
  )
}

/**
 * 解析输入文本为 JSON；失败返回 error
 */
export function tryParseJson(text: string): { ok: true; data: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, data: JSON.parse(text) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'JSON 解析失败' }
  }
}
