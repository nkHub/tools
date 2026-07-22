import { useState } from 'react'
import { Select } from '../components/Select'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'

/** GUID 输出格式 */
type GuidFormat = 'standard' | 'upper' | 'nohyphen' | 'braces' | 'urn'

/**
 * 生成 UUID v4（优先 crypto.randomUUID）
 */
function createUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // 回退：RFC4122 v4
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function formatGuid(id: string, fmt: GuidFormat): string {
  const lower = id.toLowerCase()
  switch (fmt) {
    case 'upper':
      return lower.toUpperCase()
    case 'nohyphen':
      return lower.replace(/-/g, '')
    case 'braces':
      return `{${lower}}`
    case 'urn':
      return `urn:uuid:${lower}`
    default:
      return lower
  }
}

/**
 * GUID / UUID 批量生成工具
 */
export function GuidTool() {
  const [count, setCount] = useState(5)
  const [format, setFormat] = useState<GuidFormat>('standard')
  const [list, setList] = useState<string[]>(() =>
    Array.from({ length: 5 }, () => formatGuid(createUuid(), 'standard')),
  )
  const { copy } = useCopyFeedback()

  function handleGenerate() {
    const n = Math.max(1, Math.min(200, count))
    setList(Array.from({ length: n }, () => formatGuid(createUuid(), format)))
  }

  function handleReformat(next: GuidFormat) {
    setFormat(next)
    // 基于当前列表重新套格式：先还原为标准再格式化
    setList((prev) =>
      prev.map((item) => {
        const raw = item
          .replace(/^urn:uuid:/i, '')
          .replace(/[{}]/g, '')
          .replace(/-/g, '')
          .toLowerCase()
        if (raw.length !== 32) return formatGuid(createUuid(), next)
        const std = `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`
        return formatGuid(std, next)
      }),
    )
  }

  return (
    <ToolPage
      title="GUID 生成"
      description="批量生成 UUID v4 / GUID，支持标准、大写、无连字符、花括号、URN 等格式。"
      badge="离线"
    >
      <div className="panel">
        <div className="toolbar" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="field" style={{ width: '8rem' }}>
            <label>数量（1–200）</label>
            <input
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
            />
          </div>
          <div className="field" style={{ minWidth: '10rem' }}>
            <label>格式</label>
            <Select
              value={format}
              onChange={(v) => handleReformat(v as GuidFormat)}
              aria-label="GUID 格式"
              options={[
                { value: 'standard', label: '标准小写' },
                { value: 'upper', label: '标准大写' },
                { value: 'nohyphen', label: '无连字符' },
                { value: 'braces', label: '花括号' },
                { value: 'urn', label: 'URN' },
              ]}
            />
          </div>
          <div className="toolbar" style={{ alignSelf: 'flex-end' }}>
            <button type="button" className="btn btn-primary" onClick={handleGenerate}>
              生成
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => copy(list.join('\n'))}
              disabled={!list.length}
            >
              复制全部
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>结果</h2>
          <span className="status-info">{list.length} 条</span>
        </div>
        <dl className="kv-list">
          {list.map((id, i) => (
            <div className="kv-item" key={`${id}-${i}`}>
              <dt>#{i + 1}</dt>
              <dd>{id}</dd>
              <button type="button" className="btn btn-ghost" onClick={() => copy(id)}>
                复制
              </button>
            </div>
          ))}
        </dl>
      </div>
    </ToolPage>
  )
}
