import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * 路由 pathname 变化时滚到页面顶部
 * - 首页（/）排除：保留分类 hash 锚点滚动位置
 * - hash 变化本身也不处理
 */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // 首页不强制滚顶，避免打断分类锚点定位
    if (pathname === '/') return

    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname])

  return null
}
