import { useMemo, useState } from 'react'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import {
  COMMON_RADICES,
  bigintToHexBytes,
  formatRadix,
  parseRadix,
} from '../utils/radix'

/**
 * 进制转换工具
 * - 任一进制输入，实时输出 2/8/10/16/32/36 及自定义
 * - 支持负整数、下划线分隔
 */
export function RadixTool() {
  const [input, setInput] = useState('255')
  const [fromRadix, setFromRadix] = useState(10)
  const [customRadix, setCustomRadix] = useState(36)
  const [upper, setUpper] = useState(false)
  const { copy } = useCopyFeedback()

  const parsed = useMemo(() => parseRadix(input, fromRadix), [input, fromRadix])

  const outputs = useMemo(() => {
    if (parsed.error || input.trim() === '') {
      return null
    }
    const v = parsed.value
    const map: Record<number, string> = {}
    for (const { radix } of COMMON_RADICES) {
      map[radix] = formatRadix(v, radix, upper)
    }
    map[customRadix] = formatRadix(v, customRadix, upper)
    return { value: v, map, bytes: bigintToHexBytes(v < 0n ? -v : v) }
  }, [parsed, input, customRadix, upper])

  function setFromCommon(radix: number, sample?: string) {
    setFromRadix(radix)
    if (sample !== undefined) setInput(sample)
  }

  return (
    <ToolPage
      title="进制转换"
      description="2–36 进制整数互转。支持负号、下划线分隔与 0x/0b/0o 前缀剥离。"
      badge="离线"
    >
      <div className="panel">
        <div
          className="toolbar"
          style={{ flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}
        >
          {COMMON_RADICES.slice(0, 4).map(({ radix, label }) => (
            <button
              key={radix}
              type="button"
              className={`btn ${fromRadix === radix ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFromCommon(radix)}
            >
              {label}({radix})
            </button>
          ))}
          <label className="check-label" style={{ marginLeft: 'auto' }}>
            <input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} />
            大写字母
          </label>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 8rem',
            gap: '0.75rem',
          }}
        >
          <div className="field">
            <label>输入数值</label>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例如 255、0xFF、1010_1010"
              spellCheck={false}
              style={{ fontFamily: 'var(--font-mono, monospace)' }}
            />
          </div>
          <div className="field">
            <label>输入进制 (2–36)</label>
            <input
              type="number"
              min={2}
              max={36}
              value={fromRadix}
              onChange={(e) => {
                const n = Number(e.target.value)
                if (Number.isFinite(n)) setFromRadix(Math.max(2, Math.min(36, Math.floor(n))))
              }}
            />
          </div>
        </div>

        {parsed.error ? <p className="error-msg">{parsed.error}</p> : null}

        <div className="toolbar" style={{ marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span className="hint">快捷示例：</span>
          <button type="button" className="btn btn-ghost" onClick={() => setFromCommon(10, '255')}>
            255
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setFromCommon(16, 'FF')}>
            FF
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setFromCommon(2, '11111111')}
          >
            11111111
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setFromCommon(8, '377')}>
            377
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '1rem' }}>
        <div className="panel-head">
          <h2>转换结果</h2>
        </div>
        {!outputs ? (
          <p className="hint">{input.trim() ? '等待有效输入…' : '请输入数值'}</p>
        ) : (
          <div className="field-stack">
            {COMMON_RADICES.map(({ radix, label, prefix }) => {
              const body = outputs.map[radix] ?? ''
              const withPrefix = prefix && body && !body.startsWith('-') ? prefix + body : body
              return (
                <div key={radix} className="field">
                  <label>
                    {label}（{radix}）
                  </label>
                  <div className="toolbar">
                    <input
                      readOnly
                      value={body}
                      style={{ flex: 1, fontFamily: 'var(--font-mono, monospace)' }}
                    />
                    {prefix ? (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => void copy(withPrefix)}
                        title="复制带前缀"
                      >
                        前缀
                      </button>
                    ) : null}
                    <button type="button" className="btn btn-ghost" onClick={() => void copy(body)}>
                      复制
                    </button>
                  </div>
                </div>
              )
            })}

            <div className="field">
              <label>自定义进制输出</label>
              <div className="toolbar" style={{ gap: '0.5rem' }}>
                <input
                  type="number"
                  min={2}
                  max={36}
                  value={customRadix}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (Number.isFinite(n))
                      setCustomRadix(Math.max(2, Math.min(36, Math.floor(n))))
                  }}
                  style={{ width: '5rem' }}
                />
                <input
                  readOnly
                  value={outputs.map[customRadix] ?? formatRadix(outputs.value, customRadix, upper)}
                  style={{ flex: 1, fontFamily: 'var(--font-mono, monospace)' }}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    void copy(
                      outputs.map[customRadix] ?? formatRadix(outputs.value, customRadix, upper),
                    )
                  }
                >
                  复制
                </button>
              </div>
            </div>

            <div className="field">
              <label>字节（大端 hex）</label>
              <div className="toolbar">
                <input
                  readOnly
                  value={outputs.bytes}
                  style={{ flex: 1, fontFamily: 'var(--font-mono, monospace)' }}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => void copy(outputs.bytes)}
                >
                  复制
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  )
}
