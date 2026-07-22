import type { ReactNode } from 'react'
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
}

/**
 * 统一工具页外壳：标题、说明、内容区
 */
export function ToolPage({ title, description, children, badge }: ToolPageProps) {
  return (
    <section className="tool-page">
      <header className="tool-page-header">
        <div>
          <div className="tool-title-row">
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
