import { useCallback } from 'react'
import { useToast } from '../components/Toast'
import { copyToClipboard } from '../utils/clipboard'

/**
 * 复制文本，并通过全局 Toast 反馈「已复制 / 复制失败」
 * 替代原先内联的 feedback-toast 文案
 */
export function useCopyFeedback() {
  const { showToast } = useToast()

  const copy = useCallback(
    async (text: string) => {
      if (!text) {
        showToast('无可复制内容', 'info')
        return false
      }

      const ok = await copyToClipboard(text)
      showToast(ok ? '已复制' : '复制失败', ok ? 'success' : 'error')
      return ok
    },
    [showToast],
  )

  return { copy }
}
