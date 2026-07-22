import { useMemo, useState } from 'react'
import { Select } from '../components/Select'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'

/** Base64 变体：标准 / URL 安全 */
type Base64Variant = 'standard' | 'url'

/**
 * 将字符串编码为 Base64（支持 UTF-8）
 * btoa 仅支持 Latin1，需先经 TextEncoder 转字节
 */
function encodeBase64(text: string, variant: Base64Variant): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  // 分块拼接，避免超大字符串时 call stack 溢出
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  let result = btoa(binary)
  if (variant === 'url') {
    // URL-safe：+ → -，/ → _，并去掉 padding
    result = result.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  }
  return result
}

/**
 * 将 Base64 解码为 UTF-8 字符串
 * 兼容标准与 URL-safe，自动补齐 padding
 */
function decodeBase64(raw: string, variant: Base64Variant): string {
  // 去除空白与常见换行
  let text = raw.replace(/\s+/g, '')
  if (!text) {
    throw new Error('输入为空')
  }

  if (variant === 'url' || /[-_]/.test(text)) {
    // URL-safe 转标准
    text = text.replace(/-/g, '+').replace(/_/g, '/')
  }

  // 补齐 = padding，使长度变为 4 的倍数
  const pad = text.length % 4
  if (pad === 1) {
    throw new Error('Base64 长度非法（余 1）')
  }
  if (pad > 0) {
    text += '='.repeat(4 - pad)
  }

  // 基础字符校验
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text)) {
    throw new Error('包含非法 Base64 字符')
  }

  let binary: string
  try {
    binary = atob(text)
  } catch {
    throw new Error('Base64 解码失败，请检查输入')
  }

  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}

/**
 * Base64 加密 / 解密工具
 * 纯前端，支持标准与 URL-safe，UTF-8 中文安全
 */
export function Base64Tool() {
  const [input, setInput] = useState('Hello, 离线工具箱!')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [variant, setVariant] = useState<Base64Variant>('standard')
  const { copy } = useCopyFeedback()

  const charCount = useMemo(() => input.length, [input])

  /** 加密：明文 → Base64 */
  function handleEncode() {
    try {
      const result = encodeBase64(input, variant)
      setOutput(result)
      setError('')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '编码失败'
      setError(msg)
      setOutput('')
    }
  }

  /** 解密：Base64 → 明文 */
  function handleDecode() {
    try {
      const result = decodeBase64(input, variant)
      setOutput(result)
      setError('')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '解码失败'
      setError(msg)
      setOutput('')
    }
  }

  /** 输出回填输入，便于继续编解码 */
  function handleUseOutput() {
    if (!output) return
    setInput(output)
    setError('')
  }

  function handleSwap() {
    if (!output) return
    setInput(output)
    setOutput(input)
    setError('')
  }

  function handleClear() {
    setInput('')
    setOutput('')
    setError('')
  }

  return (
    <ToolPage
      title="Base64 编解码"
      description="本地 Base64 加密与解密，支持 UTF-8 中文与 URL-safe 变体。数据不离开本机。"
      badge="离线"
    >
      <div className="panel">
        <div className="toolbar">
          <Select
            value={variant}
            onChange={(v) => setVariant(v as Base64Variant)}
            aria-label="Base64 变体"
            style={{ minWidth: 160 }}
            options={[
              { value: 'standard', label: '标准 Base64' },
              { value: 'url', label: 'URL-safe Base64' },
            ]}
          />

          <button type="button" className="btn btn-primary" onClick={handleEncode}>
            加密（编码）
          </button>
          <button type="button" className="btn" onClick={handleDecode}>
            解密（解码）
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleSwap} disabled={!output}>
            互换
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleUseOutput} disabled={!output}>
            输出→输入
          </button>
          <button type="button" className="btn btn-danger" onClick={handleClear}>
            清空
          </button>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>输入</h2>
            <span className="status-info">{charCount} 字符</span>
          </div>
          <div className="field">
            <textarea
              className="code-area"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="明文或 Base64 文本…"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>输出</h2>
            <div className="toolbar">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => copy(output)}
                disabled={!output}
              >
                复制
              </button>
            </div>
          </div>
          {error ? <p className="status-error">{error}</p> : null}
          <div className="field">
            <textarea
              className="code-area"
              value={output}
              readOnly
              placeholder="结果将显示在这里…"
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      <div className="panel">
        <p className="status-info" style={{ margin: 0, lineHeight: 1.65 }}>
          说明：编码使用 UTF-8；URL-safe 会将 <code>+</code>/<code>/</code> 替换为 <code>-</code>/<code>_</code> 并去掉
          <code>=</code>。解密时自动识别空白与 padding。
        </p>
      </div>
    </ToolPage>
  )
}
