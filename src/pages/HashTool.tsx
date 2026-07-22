import { useCallback, useEffect, useRef, useState } from 'react'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import { HASH_ALGOS, hashBuffer, textToBuffer, type HashAlgo } from '../utils/hash'

/**
 * 哈希计算工具
 * - 文本 / 文件
 * - MD5 + SHA-1/256/384/512
 */
export function HashTool() {
  const [mode, setMode] = useState<'text' | 'file'>('text')
  const [text, setText] = useState('Hello, World!')
  const [fileName, setFileName] = useState('')
  const [fileBuf, setFileBuf] = useState<ArrayBuffer | null>(null)
  const [results, setResults] = useState<Partial<Record<HashAlgo, string>>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [upper, setUpper] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { copy } = useCopyFeedback()

  const compute = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      let data: ArrayBuffer
      if (mode === 'text') {
        data = textToBuffer(text)
      } else {
        if (!fileBuf) {
          setResults({})
          setError('请先选择文件')
          return
        }
        data = fileBuf
      }

      const next: Partial<Record<HashAlgo, string>> = {}
      // 并行计算各算法
      await Promise.all(
        HASH_ALGOS.map(async (algo) => {
          next[algo] = await hashBuffer(algo, data)
        }),
      )
      setResults(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setResults({})
    } finally {
      setLoading(false)
    }
  }, [mode, text, fileBuf])

  // 文本模式实时计算（短防抖）
  useEffect(() => {
    if (mode !== 'text') return
    const id = window.setTimeout(() => {
      void compute()
    }, 200)
    return () => window.clearTimeout(id)
  }, [mode, text, compute])

  // 文件模式在选中后计算
  useEffect(() => {
    if (mode === 'file' && fileBuf) {
      void compute()
    }
  }, [mode, fileBuf, compute])

  async function handleFile(file: File | null) {
    if (!file) {
      setFileName('')
      setFileBuf(null)
      setResults({})
      return
    }
    setFileName(file.name)
    const buf = await file.arrayBuffer()
    setFileBuf(buf)
  }

  function display(hex: string | undefined) {
    if (!hex) return '—'
    return upper ? hex.toUpperCase() : hex
  }

  return (
    <ToolPage
      title="哈希计算"
      description="MD5 / SHA-1 / SHA-256 / SHA-384 / SHA-512。支持文本与文件，全部本地计算。"
      badge="离线"
    >
      <div className="panel">
        <div className="toolbar" style={{ marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            type="button"
            className={`btn ${mode === 'text' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('text')}
          >
            文本
          </button>
          <button
            type="button"
            className={`btn ${mode === 'file' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('file')}
          >
            文件
          </button>
          <label className="check-label" style={{ marginLeft: 'auto' }}>
            <input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} />
            大写输出
          </label>
          {mode === 'file' ? (
            <button type="button" className="btn btn-ghost" onClick={() => void compute()} disabled={loading}>
              {loading ? '计算中…' : '重新计算'}
            </button>
          ) : null}
        </div>

        {mode === 'text' ? (
          <div className="field">
            <label>输入文本</label>
            <textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="输入要计算哈希的文本…"
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="field">
            <label>选择文件</label>
            <input
              ref={inputRef}
              type="file"
              onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
            />
            {fileName ? (
              <p className="hint" style={{ marginTop: '0.5rem' }}>
                已选：{fileName}
                {fileBuf ? `（${fileBuf.byteLength.toLocaleString()} 字节）` : ''}
              </p>
            ) : null}
          </div>
        )}

        {error ? <p className="error-msg">{error}</p> : null}
      </div>

      <div className="panel" style={{ marginTop: '1rem' }}>
        <div className="panel-head">
          <h2>哈希结果</h2>
        </div>
        <div className="field-stack">
          {HASH_ALGOS.map((algo) => (
            <div key={algo} className="field">
              <label>{algo}</label>
              <div className="toolbar">
                <input
                  readOnly
                  value={display(results[algo])}
                  style={{ flex: 1, fontFamily: 'var(--font-mono, monospace)', fontSize: '0.85rem' }}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={!results[algo]}
                  onClick={() => void copy(display(results[algo]) === '—' ? '' : display(results[algo]))}
                >
                  复制
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToolPage>
  )
}
