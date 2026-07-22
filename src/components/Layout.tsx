import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { categoryToId, getToolCategories } from '../data/tools'
import { ScrollToTop } from './ScrollToTop'
import { ToastProvider } from './Toast'
import './Layout.css'

/**
 * 全站布局：顶栏按分类导航 + 主内容区 + 页脚
 * 分类点击跳转首页并滚动到对应锚点
 */
export function Layout() {
  const location = useLocation()
  const categories = getToolCategories()
  /** 当前 hash 对应的分类锚点（仅首页生效） */
  const activeHash = location.pathname === '/' ? location.hash.replace(/^#/, '') : ''

  return (
    <ToastProvider>
      <ScrollToTop />
      <div className="app-shell">
        <header className="app-header">
          <div className="header-inner">
            <NavLink to="/" className="brand" end>
              <span className="brand-mark">🧰</span>
              <span className="brand-text">
                <strong>离线工具箱</strong>
                <small>Offline Tools</small>
              </span>
            </NavLink>

            <nav className="main-nav" aria-label="分类导航">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  isActive && !activeHash ? 'nav-link active' : 'nav-link'
                }
              >
                首页
              </NavLink>
              {categories.map((category) => {
                const id = categoryToId(category)
                const isActive = activeHash === id
                return (
                  <NavLink
                    key={id}
                    to={`/#${id}`}
                    className={() => (isActive ? 'nav-link active' : 'nav-link')}
                  >
                    {category}
                  </NavLink>
                )
              })}
            </nav>
          </div>
        </header>

        <main className="app-main">
          <Outlet />
        </main>

        <footer className="app-footer">
          <p>纯前端处理 · 数据不离开本机 · 可离线使用</p>
        </footer>
      </div>
    </ToastProvider>
  )
}
