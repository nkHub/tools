import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import './Select.css'

export interface SelectOption {
  /** 选项值 */
  value: string
  /** 展示文案 */
  label: string
  /** 禁用 */
  disabled?: boolean
}

interface SelectProps {
  /** 当前值 */
  value: string
  /** 选项列表 */
  options: SelectOption[]
  /** 变更回调 */
  onChange: (value: string) => void
  /** 无障碍标签 */
  'aria-label'?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 占位文案 */
  placeholder?: string
  /** 外层 class */
  className?: string
  /** 外层样式（如宽度） */
  style?: CSSProperties
}

/**
 * 自定义下拉选择：深色主题、键盘可操作、点击外部关闭
 * 替代原生 select 的系统样式
 */
export function Select({
  value,
  options,
  onChange,
  'aria-label': ariaLabel,
  disabled = false,
  placeholder = '请选择',
  className = '',
  style,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()

  const selected = options.find((o) => o.value === value)

  /** 可选项下标列表（跳过 disabled） */
  const getEnabledIndexes = useCallback(
    () => options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0),
    [options],
  )

  const close = useCallback(() => {
    setOpen(false)
    setHighlight(-1)
  }, [])

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        close()
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, close])

  // 打开时把高亮滚到当前项
  useLayoutEffect(() => {
    if (!open) return
    const idx = options.findIndex((o) => o.value === value && !o.disabled)
    if (idx >= 0) {
      setHighlight(idx)
      return
    }
    const first = options.findIndex((o) => !o.disabled)
    setHighlight(first)
  }, [open, value, options])

  useEffect(() => {
    if (!open || highlight < 0) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [open, highlight])

  function pick(next: string) {
    if (disabled) return
    onChange(next)
    close()
  }

  function moveHighlight(delta: number) {
    const enabledIndexes = getEnabledIndexes()
    if (!enabledIndexes.length) return
    const currentPos = enabledIndexes.indexOf(highlight)
    let nextPos: number
    if (currentPos < 0) {
      nextPos = delta > 0 ? 0 : enabledIndexes.length - 1
    } else {
      nextPos = (currentPos + delta + enabledIndexes.length) % enabledIndexes.length
    }
    setHighlight(enabledIndexes[nextPos])
  }

  function onTriggerKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        e.preventDefault()
        if (!open) {
          setOpen(true)
        } else {
          moveHighlight(e.key === 'ArrowDown' ? 1 : -1)
        }
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (!open) {
          setOpen(true)
        } else if (highlight >= 0 && options[highlight] && !options[highlight].disabled) {
          pick(options[highlight].value)
        }
        break
      case 'Escape':
        if (open) {
          e.preventDefault()
          close()
        }
        break
      case 'Tab':
        close()
        break
      default:
        break
    }
  }

  return (
    <div
      ref={rootRef}
      className={`ui-select${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}${className ? ` ${className}` : ''}`}
      style={style}
    >
      <button
        type="button"
        className="ui-select-trigger"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (!disabled) setOpen((v) => !v)
        }}
        onKeyDown={onTriggerKey}
      >
        <span className={`ui-select-value${selected ? '' : ' is-placeholder'}`}>
          {selected?.label ?? placeholder}
        </span>
        <span className="ui-select-chevron" aria-hidden>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 4.25L6 7.75L9.5 4.25"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          className="ui-select-menu"
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
        >
          {options.map((opt, index) => {
            const isSelected = opt.value === value
            const isActive = index === highlight
            return (
              <li
                key={opt.value}
                role="option"
                data-index={index}
                aria-selected={isSelected}
                aria-disabled={opt.disabled || undefined}
                className={`ui-select-option${isSelected ? ' is-selected' : ''}${isActive ? ' is-active' : ''}${opt.disabled ? ' is-disabled' : ''}`}
                onMouseEnter={() => {
                  if (!opt.disabled) setHighlight(index)
                }}
                onMouseDown={(e) => {
                  // 避免 button 失焦导致菜单先关
                  e.preventDefault()
                }}
                onClick={() => {
                  if (!opt.disabled) pick(opt.value)
                }}
              >
                <span>{opt.label}</span>
                {isSelected ? (
                  <span className="ui-select-check" aria-hidden>
                    ✓
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
