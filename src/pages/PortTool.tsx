import { useMemo, useState } from 'react'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import { PORTS, searchPorts } from '../data/ports'
import './PortTool.css'

const QUICK = ['80', '443', '22', '3306', '5432', '6379', '27017', '8080', 'dns', 'redis', 'k8s']

/**
 * 常见端口 / 服务速查
 */
export function PortTool() {
  const [query, setQuery] = useState('443')
  const { copy } = useCopyFeedback()

  const list = useMemo(() => searchPorts(query, 100), [query])
  const exactPort = useMemo(() => {
    const n = Number(query.trim())
    if (!/^\d{1,5}$/.test(query.trim()) || !Number.isFinite(n)) return null
    return PORTS.filter((p) => p.port === n)
  }, [query])

  return (
    <ToolPage
      title="端口 / 服务速查"
      description="常见 TCP/UDP 端口与服务对照。静态精选表，纯本地搜索，适合开发调试与排障。"
      badge="离线"
    >
      <div className="panel">
        <div className="field">
          <label>搜索（端口号 / 服务名 / 描述 / 标签）</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例如 443、mysql、redis、web"
            spellCheck={false}
            autoFocus
          />
        </div>
        <div className="port-quick">
          {QUICK.map((q) => (
            <button key={q} type="button" className="btn btn-ghost port-chip" onClick={() => setQuery(q)}>
              {q}
            </button>
          ))}
        </div>
        {exactPort && exactPort.length > 0 ? (
          <div className="port-exact">
            <span className="status-ok">精确端口 {exactPort[0].port}</span>
            <span className="status-info">
              {exactPort.map((e) => `${e.service} (${e.proto})`).join(' · ')}
            </span>
          </div>
        ) : null}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>结果（{list.length}）</h2>
          <span className="status-info">共收录 {PORTS.length} 条常用记录</span>
        </div>
        {list.length === 0 ? (
          <p className="status-info" style={{ margin: 0 }}>
            无匹配项。可试端口号或服务关键字（如 ssh、postgres）。
          </p>
        ) : (
          <div className="port-table-wrap">
            <table className="port-table">
              <thead>
                <tr>
                  <th>端口</th>
                  <th>协议</th>
                  <th>服务</th>
                  <th>说明</th>
                  <th>标签</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={`${row.port}-${row.service}-${row.proto}`}>
                    <td className="port-num">{row.port}</td>
                    <td>
                      <span className="port-proto">{row.proto}</span>
                    </td>
                    <td className="port-service">{row.service}</td>
                    <td>{row.desc}</td>
                    <td>
                      <div className="port-tags">
                        {(row.tags ?? []).map((t) => (
                          <button
                            key={t}
                            type="button"
                            className="port-tag"
                            onClick={() => setQuery(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="port-actions">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => void copy(String(row.port))}
                      >
                        端口
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => void copy(`${row.port}/${row.proto} ${row.service}`)}
                      >
                        复制
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="status-info" style={{ margin: '0.75rem 0 0' }}>
          说明：本表为开发常用精选，非完整 IANA 分配列表；同一端口可能对应多种软件部署约定。
        </p>
      </div>
    </ToolPage>
  )
}
