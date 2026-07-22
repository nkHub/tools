import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { tools } from '../data/tools'
import { ToolIcon } from './ToolIcon'
import './ToolPage.css'

interface ToolPageProps {
  /** 页面标题 */
  title: string
  /** 页面说明 */
  description: string
  /** 页面主体 */
  children: ReactNode
  /** 可选：标题旁徽章 */
  badge?: string
  /** 可选：Lucide 图标名；缺省时按当前路由从 tools 配置解析 */
  icon?: string
}

/**
 * 统一工具页外壳：标题、说明、内容区
 */
export function ToolPage({ title, description, children, badge, icon }: ToolPageProps) {
  const location = useLocation()
  const resolvedIcon =
    icon ?? tools.find((t) => t.path === location.pathname || location.pathname.endsWith(t.path))?.icon

  return (
    <section className="tool-page">
      <header className="tool-page-header">
        <div>
          <div className="tool-title-row">
            {resolvedIcon ? (
              <span className="tool-title-icon" aria-hidden>
                <ToolIcon name={resolvedIcon} size={22} />
              </span>
            ) : null}
            <h1>{title}</h1>
            {badge ? <span className="tool-badge">{badge}</span> : null}
          </div>
          <p className="tool-desc">{description}</p>
        </div>
      </header>
      <div className="tool-page-body">{children}</div>
    </section>
  )
}
