import { useState } from 'react'
import { dump as yamlDump, load as yamlLoad } from 'js-yaml'
import { Select } from '../components/Select'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'

type Mode = 'yaml-format' | 'yaml-to-json' | 'json-to-yaml'

/**
 * YAML 工具：格式化、校验，以及与 JSON 互转
 * 使用 js-yaml 在浏览器内解析，不依赖后端
 */
export function YamlTool() {
  const [mode, setMode] = useState<Mode>('yaml-format')
  const [input, setInput] = useState('name: offline-tools\nversion: 1.0.0\nfeatures:\n  - json\n  - yaml\n  - timestamp\n')
  const [indent, setIndent] = useState(2)
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const { copy } = useCopyFeedback()

  function handleConvert() {
    try {
      if (mode === 'json-to-yaml') {
        const data = JSON.parse(input)
        // js-yaml v5 使用命名导出 dump/load
        const text = yamlDump(data, {
          indent,
          lineWidth: -1,
          noRefs: true,
          sortKeys: false,
        })
        setOutput(text)
        setError('')
        return
      }

      // YAML 解析（格式化 / 转 JSON），使用默认 CORE_SCHEMA
      const data = yamlLoad(input)
      if (mode === 'yaml-to-json') {
        setOutput(JSON.stringify(data, null, indent))
      } else {
        setOutput(
          yamlDump(data, {
            indent,
            lineWidth: -1,
            noRefs: true,
          }),
        )
      }
      setError('')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '解析失败'
      setError(msg)
      setOutput('')
    }
  }

  function handleValidate() {
    try {
      if (mode === 'json-to-yaml') {
        JSON.parse(input)
        setOutput('✓ JSON 合法')
      } else {
        yamlLoad(input)
        setOutput('✓ YAML 合法')
      }
      setError('')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '校验失败'
      setError(msg)
      setOutput('')
    }
  }

  function handleClear() {
    setInput('')
    setOutput('')
    setError('')
  }

  function handleUseOutput() {
    if (!output || output.startsWith('✓')) return
    setInput(output)
  }

  const inputLabel =
    mode === 'json-to-yaml' ? 'JSON 输入' : 'YAML 输入'
  const outputHint =
    mode === 'yaml-to-json' ? 'JSON 输出' : mode === 'json-to-yaml' ? 'YAML 输出' : 'YAML 输出'

  return (
    <ToolPage
      title="YAML 工具"
      description="本地 YAML 格式化与校验，支持 YAML ↔ JSON 互转。解析在浏览器内完成。"
      badge="离线"
    >
      <div className="panel">
        <div className="toolbar">
          <Select
            value={mode}
            onChange={(v) => setMode(v as Mode)}
            aria-label="转换模式"
            style={{ minWidth: 168 }}
            options={[
              { value: 'yaml-format', label: 'YAML 格式化' },
              { value: 'yaml-to-json', label: 'YAML → JSON' },
              { value: 'json-to-yaml', label: 'JSON → YAML' },
            ]}
          />

          <Select
            value={String(indent)}
            onChange={(v) => setIndent(Number(v))}
            aria-label="缩进空格数"
            style={{ minWidth: 132 }}
            options={[
              { value: '2', label: '缩进 2 空格' },
              { value: '4', label: '缩进 4 空格' },
            ]}
          />

          <button type="button" className="btn btn-primary" onClick={handleConvert}>
            转换 / 格式化
          </button>
          <button type="button" className="btn" onClick={handleValidate}>
            校验
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleUseOutput}>
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
            <h2>{inputLabel}</h2>
          </div>
          <div className="field">
            <textarea
              className="code-area"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="粘贴内容…"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>{outputHint}</h2>
            <div className="toolbar">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => copy(output.startsWith('✓') ? '' : output)}
                disabled={!output || output.startsWith('✓')}
              >
                复制
              </button>
            </div>
          </div>
          {error ? <p className="status-error">{error}</p> : null}
          {!error && output.startsWith('✓') ? <p className="status-ok">{output}</p> : null}
          <div className="field">
            <textarea
              className="code-area"
              value={output.startsWith('✓') ? '' : output}
              readOnly
              placeholder="结果将显示在这里…"
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </ToolPage>
  )
}
