import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ToolIcon } from '../components/ToolIcon'
import { categoryToId, groupToolsByCategory, tools } from '../data/tools'
import './Home.css'

/**
 * 滚动到分类锚点，抵消 sticky 顶栏高度
 */
function scrollToCategoryAnchor(hash: string) {
  const id = hash.replace(/^#/, '')
  if (!id) return
  const el = document.getElementById(id)
  if (!el) return
  // 顶栏约 56px，再留一点间距
  const offset = 72
  const top = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}

/**
 * 首页：工具总览与离线说明
 * 支持 /#cat-xxx 分类锚点滚动
 */
export function Home() {
  const groups = groupToolsByCategory(tools)
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    // 等 DOM 就绪后再滚（从其它路由返回时）
    const t = window.setTimeout(() => scrollToCategoryAnchor(location.hash), 50)
    return () => window.clearTimeout(t)
  }, [location.hash, location.pathname, location.key])

  return (
    <div className="home">
      <section className="hero-card">
        <div>
          <p className="eyebrow">纯前端 · 可离线</p>
          <h1>开发者离线工具箱</h1>
          <p className="lead">
            全部在浏览器本地完成：JSON / YAML / Base64、颜色与调色板、时间戳、
            加解密、正则测试、密码与 GUID、本机与公网 IP 等。
            不上传业务数据，打开即可用。
          </p>
          <div className="hero-tags">
            <span>JSON</span>
            <span>YAML</span>
            <span>Base64</span>
            <span>颜色</span>
            <span>加密</span>
            <span>正则</span>
            <span>指纹</span>
            <span>密码</span>
          </div>
        </div>
        <div className="hero-stats">
          <div>
            <strong>{tools.length}</strong>
            <span>个常用工具</span>
          </div>
          <div>
            <strong>0</strong>
            <span>服务端存储</span>
          </div>
          <div>
            <strong>100%</strong>
            <span>浏览器处理</span>
          </div>
        </div>
      </section>

      {[...groups.entries()].map(([category, items]) => {
        const id = categoryToId(category)
        return (
          <section key={category} id={id} className="tool-group">
            <h2>{category}</h2>
            <div className="tool-grid">
              {items.map((tool) => (
                <Link key={tool.path} to={tool.path} className="tool-card">
                  <div className="tool-icon" aria-hidden>
                    <ToolIcon name={tool.icon} size={20} />
                  </div>
                  <div>
                    <h3>{tool.name}</h3>
                    <p>{tool.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )
      })}

      <section className="note-card">
        <h2>使用说明</h2>
        <ul>
          <li>JSON / YAML / 时间戳 / 加解密 / 正则等均为纯本地计算，断网也可使用。</li>
          <li>公网 IP 查询依赖第三方公开接口；浏览器指纹来自本机环境 API，不上传。</li>
        </ul>
      </section>
    </div>
  )
}
