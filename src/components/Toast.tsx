import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { UiIcon } from './ToolIcon'
import './Toast.css'

/** Toast 类型：影响配色 */
export type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  /** 弹出一条 Toast */
  showToast: (message: string, type?: ToastType, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * 全局 Toast 容器：在 Layout 中挂载一次
 * 子组件通过 useToast() 弹出提示
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const idRef = useRef(0)
  const timersRef = useRef<Map<number, number>>(new Map())

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastType = 'success', duration = 1800) => {
      const id = ++idRef.current
      setItems((prev) => [...prev.slice(-4), { id, message, type }])
      const timer = window.setTimeout(() => remove(id), duration)
      timersRef.current.set(id, timer)
    },
    [remove],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-relevant="additions">
        {items.map((item) => (
          <div
            key={item.id}
            className={`toast-item toast-${item.type}`}
            role="status"
            onClick={() => remove(item.id)}
          >
            <span className="toast-icon" aria-hidden>
              <UiIcon
                name={item.type === 'success' ? 'check' : item.type === 'error' ? 'alert' : 'info'}
                size={15}
                strokeWidth={2.25}
              />
            </span>
            <span className="toast-text">{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/**
 * 读取全局 Toast API；必须在 ToastProvider 内使用
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast 必须在 ToastProvider 内使用')
  }
  return ctx
}
