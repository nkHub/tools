import { useMemo, useState } from 'react'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'

const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?/|~'

/**
 * 使用 crypto.getRandomValues 从字符集中安全取样
 */
function secureRandomChar(charset: string): string {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return charset[arr[0] % charset.length]
}

/**
 * 生成密码：保证至少各选一类已启用字符，再填充剩余
 */
function generatePassword(
  length: number,
  opts: { lower: boolean; upper: boolean; digits: boolean; symbols: boolean },
): string {
  const pools: string[] = []
  if (opts.lower) pools.push(LOWER)
  if (opts.upper) pools.push(UPPER)
  if (opts.digits) pools.push(DIGITS)
  if (opts.symbols) pools.push(SYMBOLS)
  if (!pools.length) throw new Error('请至少选择一种字符类型')

  const len = Math.max(4, Math.min(128, length))
  const all = pools.join('')
  const chars: string[] = pools.map((p) => secureRandomChar(p))

  while (chars.length < len) {
    chars.push(secureRandomChar(all))
  }

  // Fisher–Yates 洗牌
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const arr = new Uint32Array(1)
    crypto.getRandomValues(arr)
    const j = arr[0] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

/** 简单强度评估 */
function scorePassword(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '—', color: 'var(--muted)' }
  let score = 0
  if (pwd.length >= 8) score += 1
  if (pwd.length >= 12) score += 1
  if (pwd.length >= 16) score += 1
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1
  if (/\d/.test(pwd)) score += 1
  if (/[^a-zA-Z0-9]/.test(pwd)) score += 1
  if (score <= 2) return { score, label: '弱', color: '#f87171' }
  if (score <= 4) return { score, label: '中', color: '#fbbf24' }
  return { score, label: '强', color: '#4ade80' }
}

/**
 * 随机密码生成工具
 */
export function PasswordTool() {
  const [length, setLength] = useState(16)
  const [lower, setLower] = useState(true)
  const [upper, setUpper] = useState(true)
  const [digits, setDigits] = useState(true)
  const [symbols, setSymbols] = useState(true)
  const [count, setCount] = useState(1)
  const [passwords, setPasswords] = useState<string[]>([])
  const [error, setError] = useState('')
  const { copy } = useCopyFeedback()

  const primary = passwords[0] ?? ''
  const strength = useMemo(() => scorePassword(primary), [primary])

  function handleGenerate() {
    try {
      const n = Math.max(1, Math.min(50, count))
      const list: string[] = []
      for (let i = 0; i < n; i += 1) {
        list.push(generatePassword(length, { lower, upper, digits, symbols }))
      }
      setPasswords(list)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
      setPasswords([])
    }
  }

  return (
    <ToolPage
      title="随机密码生成"
      description="基于 Web Crypto 安全随机数生成密码，可配置长度、字符集与批量数量。"
      badge="离线"
    >
      <div className="panel">
        <div className="grid-3">
          <div className="field">
            <label>长度（4–128）</label>
            <input
              type="number"
              min={4}
              max={128}
              value={length}
              onChange={(e) => setLength(Math.max(4, Math.min(128, Number(e.target.value) || 4)))}
            />
          </div>
          <div className="field">
            <label>生成数量（1–50）</label>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            />
          </div>
          <div className="field">
            <label>强度（首条）</label>
            <input readOnly value={strength.label} style={{ color: strength.color, fontWeight: 700 }} />
          </div>
        </div>

        <div className="toolbar" style={{ marginTop: '0.85rem', gap: '1rem' }}>
          <label className="toolbar" style={{ gap: '0.35rem' }}>
            <input type="checkbox" checked={lower} onChange={(e) => setLower(e.target.checked)} />
            <span style={{ fontSize: '0.875rem' }}>小写 a-z</span>
          </label>
          <label className="toolbar" style={{ gap: '0.35rem' }}>
            <input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} />
            <span style={{ fontSize: '0.875rem' }}>大写 A-Z</span>
          </label>
          <label className="toolbar" style={{ gap: '0.35rem' }}>
            <input type="checkbox" checked={digits} onChange={(e) => setDigits(e.target.checked)} />
            <span style={{ fontSize: '0.875rem' }}>数字 0-9</span>
          </label>
          <label className="toolbar" style={{ gap: '0.35rem' }}>
            <input type="checkbox" checked={symbols} onChange={(e) => setSymbols(e.target.checked)} />
            <span style={{ fontSize: '0.875rem' }}>符号</span>
          </label>
        </div>

        <div className="toolbar" style={{ marginTop: '0.85rem' }}>
          <button type="button" className="btn btn-primary" onClick={handleGenerate}>
            生成密码
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => copy(primary)}
            disabled={!primary}
          >
            复制首条
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => copy(passwords.join('\n'))}
            disabled={!passwords.length}
          >
            复制全部
          </button>
        </div>
        {error ? <p className="status-error" style={{ marginTop: '0.65rem' }}>{error}</p> : null}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>结果</h2>
          <span className="status-info">{passwords.length} 条</span>
        </div>
        {passwords.length === 0 ? (
          <p className="status-info">点击「生成密码」开始</p>
        ) : (
          <dl className="kv-list">
            {passwords.map((pwd, i) => (
              <div className="kv-item" key={`${pwd}-${i}`}>
                <dt>#{i + 1}</dt>
                <dd style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.02em' }}>
                  {pwd}
                </dd>
                <button type="button" className="btn btn-ghost" onClick={() => copy(pwd)}>
                  复制
                </button>
              </div>
            ))}
          </dl>
        )}
      </div>
    </ToolPage>
  )
}
