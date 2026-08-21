import { useState } from 'react'
import { Select } from '../components/Select'
import { ToolPage } from '../components/ToolPage'
import { UiIcon } from '../components/ToolIcon'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import './HttpTool.css'

/** HTTP 请求方法 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
/** 请求体类型 */
type BodyType = 'none' | 'json' | 'form' | 'multipart' | 'text'
/** 请求配置 Tabs */
type ReqTab = 'params' | 'headers' | 'body'
/** 响应 Tabs */
type ResTab = 'body' | 'headers'

/** 常见 HTTP 状态码兜底文案（fetch 的 statusText 可能为空） */
const STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
}

const METHODS: { value: HttpMethod; label: string; className: string }[] = [
  { value: 'GET', label: 'GET', className: 'm-get' },
  { value: 'POST', label: 'POST', className: 'm-post' },
  { value: 'PUT', label: 'PUT', className: 'm-put' },
  { value: 'PATCH', label: 'PATCH', className: 'm-patch' },
  { value: 'DELETE', label: 'DELETE', className: 'm-delete' },
  { value: 'HEAD', label: 'HEAD', className: 'm-head' },
  { value: 'OPTIONS', label: 'OPTIONS', className: 'm-options' },
]

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: 'none', label: 'None（无请求体）' },
  { value: 'json', label: 'JSON' },
  { value: 'form', label: 'x-www-form-urlencoded' },
  { value: 'multipart', label: 'multipart/form-data（含文件上传）' },
  { value: 'text', label: 'Text（text/plain）' },
]

/** 键值对行：key / value 及是否启用 */
interface KvRow {
  id: number
  key: string
  value: string
  enabled: boolean
}

/** multipart 文件行：字段名 + 已选择的文件 */
interface FileRow {
  id: number
  key: string
  file: File | null
}

/** 响应数据结构 */
interface HttpResponse {
  status: number
  statusText: string
  timeMs: number
  sizeBytes: number
  headers: [string, string][]
  body: string
  isJson: boolean
}

/** 自增行 id，保证删除 / 增行时 key 稳定 */
let rowSeq = 0
const newRow = (): KvRow => ({ id: ++rowSeq, key: '', value: '', enabled: true })
const newFileRow = (): FileRow => ({ id: ++rowSeq, key: '', file: null })

/**
 * 从完整 URL 中解析 query 段为 KV 行数组
 * 无 query 时返回空数组（保留表格为空白待输入状态）
 */
function parseQueryToRows(url: string): KvRow[] {
  const idx = url.indexOf('?')
  if (idx < 0) return []
  const search = new URLSearchParams(url.slice(idx + 1))
  return Array.from(search.entries()).map(([k, v]) => ({
    id: ++rowSeq,
    key: k,
    value: v,
    enabled: true,
  }))
}

/**
 * 由 KV 行 + 原始 URL 的 base（问号前部分）重建完整 URL
 * 仅启用且 key 非空的行参与拼接；无有效行时只保留 base
 */
function rebuildUrl(base: string, rows: KvRow[]): string {
  const search = new URLSearchParams()
  for (const row of rows) {
    if (row.enabled && row.key.trim()) {
      search.append(row.key.trim(), row.value)
    }
  }
  const query = search.toString()
  return query ? `${base}?${query}` : base
}

/**
 * 可编辑键值对表格（用于 Params / Headers / Form Body）
 * 每行：启用开关 + Key + Value + 删除；底部提供「添加」按钮
 */
function KvEditor({
  rows,
  onChange,
  keyPlaceholder = '键名',
  valuePlaceholder = '值',
}: {
  rows: KvRow[]
  onChange: (rows: KvRow[]) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
}) {
  function update(id: number, patch: Partial<KvRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }
  return (
    <div className="kv-editor">
      <div className="kv-editor-head" aria-hidden>
        <span />
        <span>Key</span>
        <span>Value</span>
        <span />
      </div>
      {rows.map((row) => (
        <div className="kv-editor-row" key={row.id}>
          <input
            type="checkbox"
            className="kv-enabled"
            checked={row.enabled}
            onChange={(e) => update(row.id, { enabled: e.target.checked })}
            title="启用 / 禁用此行"
            aria-label={`启用 ${row.key || '空键'} 行`}
          />
          <input
            className="kv-key"
            value={row.key}
            onChange={(e) => update(row.id, { key: e.target.value })}
            placeholder={keyPlaceholder}
            spellCheck={false}
          />
          <input
            className="kv-value"
            value={row.value}
            onChange={(e) => update(row.id, { value: e.target.value })}
            placeholder={valuePlaceholder}
            spellCheck={false}
          />
          <button
            type="button"
            className="kv-del"
            onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
            title="删除此行"
            aria-label="删除此行"
          >
            <UiIcon name="trash-2" size={15} strokeWidth={2} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="kv-add"
        onClick={() => onChange([...rows, newRow()])}
      >
        <UiIcon name="plus" size={14} strokeWidth={2.2} />
        添加
      </button>
    </div>
  )
}

/**
 * multipart 文件行编辑器：每个字段名对应一个本地文件
 * 用原生 input[type=file]，选择后展示文件名
 */
function FileRowEditor({
  rows,
  onChange,
  keyPlaceholder = '字段名',
}: {
  rows: FileRow[]
  onChange: (rows: FileRow[]) => void
  keyPlaceholder?: string
}) {
  function update(id: number, patch: Partial<FileRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }
  return (
    <div className="kv-editor file-row-editor">
      <div className="kv-editor-head" aria-hidden>
        <span />
        <span>Key</span>
        <span>File</span>
        <span />
      </div>
      {rows.map((row) => (
        <div className="kv-editor-row" key={row.id}>
          <span className="kv-file-ic" aria-hidden>
            <UiIcon name="paperclip" size={14} strokeWidth={2} />
          </span>
          <input
            className="kv-key"
            value={row.key}
            onChange={(e) => update(row.id, { key: e.target.value })}
            placeholder={keyPlaceholder}
            spellCheck={false}
          />
          <label className="kv-file">
            <input
              type="file"
              onChange={(e) => update(row.id, { file: e.target.files?.[0] ?? null })}
              aria-label={`为 ${row.key || '空键'} 选择文件`}
            />
            <span className={row.file ? '' : 'is-empty'}>
              {row.file ? row.file.name : '选择文件…'}
            </span>
          </label>
          <button
            type="button"
            className="kv-del"
            onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
            title="删除此行"
            aria-label="删除此行"
          >
            <UiIcon name="trash-2" size={15} strokeWidth={2} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="kv-add"
        onClick={() => onChange([...rows, newFileRow()])}
      >
        <UiIcon name="plus" size={14} strokeWidth={2.2} />
        添加文件
      </button>
    </div>
  )
}

/**
 * HTTP 请求调试工具（类 Postman）
 * - 顶部：请求方法 + URL + 发送
 * - 中部：Params（自动与 URL 查询串双向同步）/ Headers / Body 配置
 * - 底部：响应头 / 响应体（默认展示响应体）Tab
 * 注意：浏览器端请求受同源策略（CORS）限制，跨域接口需目标允许。
 */
export function HttpTool() {
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [url, setUrl] = useState('')
  const [params, setParams] = useState<KvRow[]>([newRow()])
  const [headers, setHeaders] = useState<KvRow[]>([
    { id: ++rowSeq, key: 'Content-Type', value: 'application/json', enabled: true },
  ])
  const [reqTab, setReqTab] = useState<ReqTab>('headers')

  const [bodyType, setBodyType] = useState<BodyType>('json')
  const [jsonBody, setJsonBody] = useState('{\n  "key": "value"\n}')
  const [formBody, setFormBody] = useState<KvRow[]>([])
  const [multiFields, setMultiFields] = useState<KvRow[]>([])
  const [multiFiles, setMultiFiles] = useState<FileRow[]>([])
  const [textBody, setTextBody] = useState('')

  const [resTab, setResTab] = useState<ResTab>('body')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [response, setResponse] = useState<HttpResponse | null>(null)
  const { copy } = useCopyFeedback()

  /**
   * 用户手动编辑 URL：实时把 query 解析进 Params 表
   * 表格与 URL 的同步方向是「表格修改 → 重建 URL」，此处仅当用户直接改 URL 时回填表格
   */
  function handleUrlChange(next: string) {
    setUrl(next)
    setParams(parseQueryToRows(next))
  }

  /** Params 表修改：按当前 URL 的 base 重建完整 URL */
  function handleParamsChange(rows: KvRow[]) {
    setParams(rows)
    setUrl(rebuildUrl(url.split('?')[0], rows))
  }

  /** 构造请求头对象（仅启用且 key 非空） */
  function buildHeaders(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const row of headers) {
      if (row.enabled && row.key.trim()) {
        result[row.key.trim()] = row.value
      }
    }
    return result
  }

  /**
   * 按当前 Body 类型构造请求体与自动 Content-Type
   * - 返回 null 表示无请求体
   * - contentType 为 null 表示需由浏览器自动处理（如 FormData 的 boundary），发送时应移除手动设置的 Content-Type
   * - JSON 非法时抛出错误提示
   */
  function buildBody(): { body: BodyInit; contentType: string | null } | null {
    switch (bodyType) {
      case 'none':
        return null
      case 'json': {
        const trimmed = jsonBody.trim()
        if (!trimmed) return null
        try {
          JSON.parse(trimmed)
        } catch {
          throw new Error('请求体为 JSON 格式，但不是合法 JSON，请先修正格式')
        }
        return { body: jsonBody, contentType: 'application/json' }
      }
      case 'form': {
        const search = new URLSearchParams()
        for (const row of formBody) {
          if (row.enabled && row.key.trim()) {
            search.append(row.key.trim(), row.value)
          }
        }
        return { body: search.toString(), contentType: 'application/x-www-form-urlencoded' }
      }
      case 'multipart': {
        const fd = new FormData()
        for (const row of multiFields) {
          if (row.enabled && row.key.trim()) {
            fd.append(row.key.trim(), row.value)
          }
        }
        for (const row of multiFiles) {
          if (row.key.trim() && row.file) {
            fd.append(row.key.trim(), row.file)
          }
        }
        return { body: fd, contentType: null }
      }
      case 'text':
        return { body: textBody, contentType: 'text/plain' }
    }
  }

  /** 发送请求并记录响应 */
  async function handleSend() {
    if (!url.trim()) {
      setError('请输入请求 URL')
      return
    }
    if (sending) return

    setSending(true)
    setError('')
    const start = performance.now()
    try {
      const headersObj = buildHeaders()
      const init: RequestInit = { method, headers: headersObj }

      const hasBody = method !== 'GET' && method !== 'HEAD'
      if (hasBody) {
        const bodyRes = buildBody()
        if (bodyRes) {
          init.body = bodyRes.body
          if (bodyRes.contentType) {
            const hasContentType = Object.keys(headersObj).some(
              (k) => k.toLowerCase() === 'content-type',
            )
            if (!hasContentType) {
              headersObj['Content-Type'] = bodyRes.contentType
            }
          } else {
            // FormData：必须移除手动 Content-Type，否则 boundary 会失效
            for (const k of Object.keys(headersObj)) {
              if (k.toLowerCase() === 'content-type') {
                delete headersObj[k]
              }
            }
          }
        }
      }

      const res = await fetch(url, init)
      const raw = await res.text()
      const timeMs = Math.round(performance.now() - start)
      const sizeBytes = new TextEncoder().encode(raw).length

      const resHeaders: [string, string][] = []
      res.headers.forEach((value, key) => resHeaders.push([key, value]))

      let body = raw
      let isJson = false
      try {
        body = JSON.stringify(JSON.parse(raw), null, 2)
        isJson = true
      } catch {
        // 非 JSON 响应保持原文展示
      }

      setResponse({
        status: res.status,
        statusText: res.statusText || STATUS_TEXT[res.status] || '',
        timeMs,
        sizeBytes,
        headers: resHeaders,
        body,
        isJson,
      })
    } catch (err) {
      const msg =
        err instanceof TypeError
          ? '网络请求失败：多为跨域（CORS）受限、地址不可达或服务未启动，请检查目标接口是否允许浏览器跨域访问。'
          : err instanceof Error
            ? err.message
            : String(err)
      setError(msg)
    } finally {
      setSending(false)
    }
  }

  /** 状态码徽章色 */
  function statusClass(status: number): string {
    if (status >= 200 && status < 300) return 'st-2xx'
    if (status >= 300 && status < 400) return 'st-3xx'
    if (status >= 400 && status < 500) return 'st-4xx'
    return 'st-5xx'
  }

  return (
    <ToolPage
      title="HTTP 请求调试"
      description="类 Postman 的浏览器端请求调试：设置方法、URL、参数与请求头，查看响应体与响应头。纯浏览器 fetch 实现，跨域接口需服务端允许（CORS）。"
      badge="浏览器端"
    >
      {/* 顶部：方法 + URL + 发送 */}
      <div className="panel http-request-bar">
        <Select
          value={method}
          onChange={(v) => setMethod(v as HttpMethod)}
          aria-label="请求方法"
          className="http-method-select"
          options={METHODS.map((m) => ({ value: m.value, label: m.label }))}
        />
        <input
          className="http-url-input"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://api.example.com/users?page=1"
          spellCheck={false}
          aria-label="请求 URL"
        />
        <button
          type="button"
          className="btn btn-primary http-send-btn"
          onClick={() => void handleSend()}
          disabled={sending}
        >
          {sending ? (
            <UiIcon name="loader-2" size={15} strokeWidth={2.2} className="http-spin" />
          ) : (
            <UiIcon name="send" size={15} strokeWidth={2.2} />
          )}
          发送
        </button>
      </div>

      {/* 请求配置 Tabs：Headers / Params / Body */}
      <div className="panel http-config-panel">
        <div className="http-tabs" role="tablist" aria-label="请求配置">
          <button
            type="button"
            role="tab"
            className={`http-tab${reqTab === 'headers' ? ' active' : ''}`}
            aria-selected={reqTab === 'headers'}
            onClick={() => setReqTab('headers')}
          >
            Headers
          </button>
          <button
            type="button"
            role="tab"
            className={`http-tab${reqTab === 'params' ? ' active' : ''}`}
            aria-selected={reqTab === 'params'}
            onClick={() => setReqTab('params')}
          >
            Params
          </button>
          <button
            type="button"
            role="tab"
            className={`http-tab${reqTab === 'body' ? ' active' : ''}`}
            aria-selected={reqTab === 'body'}
            onClick={() => setReqTab('body')}
          >
            Body
          </button>
        </div>

        {reqTab === 'headers' ? (
          <div className="field">
            <KvEditor
              rows={headers}
              onChange={setHeaders}
              keyPlaceholder="如 Content-Type"
              valuePlaceholder="如 application/json"
            />
          </div>
        ) : null}

        {reqTab === 'params' ? (
          <div className="field">
            <KvEditor
              rows={params}
              onChange={handleParamsChange}
              keyPlaceholder="参数名"
              valuePlaceholder="参数值"
            />
          </div>
        ) : null}

        {reqTab === 'body' ? (
          <div className="field">
            <div className="http-body-toolbar">
              <Select
                value={bodyType}
                onChange={(v) => setBodyType(v as BodyType)}
                aria-label="请求体类型"
                style={{ minWidth: 240 }}
                options={BODY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              />
            </div>
            {bodyType === 'json' ? (
              <textarea
                className="code-area http-body-textarea"
                value={jsonBody}
                onChange={(e) => setJsonBody(e.target.value)}
                placeholder='{"key": "value"}'
                spellCheck={false}
              />
            ) : null}
            {bodyType === 'form' ? (
              <KvEditor
                rows={formBody}
                onChange={setFormBody}
                keyPlaceholder="字段名"
                valuePlaceholder="字段值"
              />
            ) : null}
            {bodyType === 'multipart' ? (
              <div className="http-multipart">
                <KvEditor
                  rows={multiFields}
                  onChange={setMultiFields}
                  keyPlaceholder="字段名"
                  valuePlaceholder="字段值"
                />
                <FileRowEditor rows={multiFiles} onChange={setMultiFiles} />
              </div>
            ) : null}
            {bodyType === 'text' ? (
              <textarea
                className="code-area http-body-textarea"
                value={textBody}
                onChange={(e) => setTextBody(e.target.value)}
                placeholder="plain text 请求体…"
                spellCheck={false}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 响应区：状态 + Tabs（响应体默认） */}
      <div className="panel http-response-panel">
        <div className="panel-head">
          <h2>响应</h2>
          <div className="http-tabs" role="tablist" aria-label="响应内容">
            <button
              type="button"
              role="tab"
              className={`http-tab${resTab === 'body' ? ' active' : ''}`}
              aria-selected={resTab === 'body'}
              onClick={() => setResTab('body')}
            >
              响应体
            </button>
            <button
              type="button"
              role="tab"
              className={`http-tab${resTab === 'headers' ? ' active' : ''}`}
              aria-selected={resTab === 'headers'}
              onClick={() => setResTab('headers')}
            >
              响应头
            </button>
          </div>
        </div>

        {response ? (
          <div className="http-meta">
            <span className={`http-status ${statusClass(response.status)}`}>
              {response.status} {response.statusText}
            </span>
            <span className="http-meta-item">耗时 {response.timeMs} ms</span>
            <span className="http-meta-item">大小 {formatBytes(response.sizeBytes)}</span>
            {response.isJson ? (
              <button
                type="button"
                className="btn btn-ghost http-copy-btn"
                onClick={() => void copy(response.body)}
                disabled={!response.body}
              >
                <UiIcon name="copy" size={14} strokeWidth={2.2} />
                复制
              </button>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="status-error http-error">{error}</p>
        ) : null}

        {resTab === 'body' ? (
          response ? (
            <pre className="http-response-body">{response.body}</pre>
          ) : (
            <div className="http-empty">
              {error ? '请求失败，请根据上方错误信息调整' : '发送请求后在此展示响应体'}
            </div>
          )
        ) : (
          response ? (
            <div className="http-headers-table" role="table" aria-label="响应头">
              <div className="http-headers-row http-headers-head" role="row">
                <span role="columnheader">Header</span>
                <span role="columnheader">Value</span>
              </div>
              {response.headers.map(([k, v]) => (
                <div className="http-headers-row" role="row" key={k}>
                  <span role="cell">{k}</span>
                  <span role="cell">{v}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="http-empty">发送请求后在此展示响应头</div>
          )
        )}
      </div>
    </ToolPage>
  )
}

/** 字节数人性化显示 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
