import type { LucideIcon, LucideProps } from 'lucide-react'
import {
  AppWindow,
  Binary,
  Blend,
  Box,
  Braces,
  Calculator,
  CaseSensitive,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Clock,
  Crop,
  FileCode2,
  FileText,
  FileType,
  Fingerprint,
  Globe2,
  Hash,
  Image,
  ImageDown,
  Info,
  KeyRound,
  Layers,
  Link2,
  Lock,
  Maximize2,
  Minimize2,
  Network,
  Package,
  Palette,
  Pipette,
  QrCode,
  Regex,
  Scan,
  Shapes,
  ShieldCheck,
  SquareRoundCorner,
  SwatchBook,
  Timer,
  Wifi,
  Wrench,
  X,
} from 'lucide-react'

/** tools.ts 中 icon 字段使用的 Lucide 图标名 */
export type ToolIconName =
  | 'braces'
  | 'file-code'
  | 'binary'
  | 'link'
  | 'calculator'
  | 'image'
  | 'package'
  | 'palette'
  | 'swatch-book'
  | 'pipette'
  | 'blend'
  | 'regex'
  | 'file-text'
  | 'timer'
  | 'qr-code'
  | 'image-down'
  | 'shapes'
  | 'square-round-corner'
  | 'hash'
  | 'shield-check'
  | 'file-type'
  | 'globe'
  | 'lock'
  | 'key-round'
  | 'scan'
  | 'fingerprint'
  | 'clock'
  | 'wifi'
  | 'wrench'
  | 'box'
  | 'layers'
  | 'app-window'
  | 'crop'
  | 'network'
  | 'case-sensitive'

const TOOL_ICON_MAP: Record<ToolIconName, LucideIcon> = {
  braces: Braces,
  'file-code': FileCode2,
  binary: Binary,
  link: Link2,
  calculator: Calculator,
  image: Image,
  package: Package,
  palette: Palette,
  'swatch-book': SwatchBook,
  pipette: Pipette,
  blend: Blend,
  regex: Regex,
  'file-text': FileText,
  timer: Timer,
  'qr-code': QrCode,
  'image-down': ImageDown,
  shapes: Shapes,
  'square-round-corner': SquareRoundCorner,
  hash: Hash,
  'shield-check': ShieldCheck,
  'file-type': FileType,
  globe: Globe2,
  lock: Lock,
  'key-round': KeyRound,
  scan: Scan,
  fingerprint: Fingerprint,
  clock: Clock,
  wifi: Wifi,
  wrench: Wrench,
  box: Box,
  layers: Layers,
  'app-window': AppWindow,
  crop: Crop,
  network: Network,
  'case-sensitive': CaseSensitive,
}

/** 通用 UI 图标（Toast / 导航 / 控件） */
export type UiIconName =
  | 'check'
  | 'x'
  | 'info'
  | 'alert'
  | 'chevron-up'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'wrench'
  | 'maximize'
  | 'minimize'

const UI_ICON_MAP: Record<UiIconName, LucideIcon> = {
  check: Check,
  x: X,
  info: Info,
  alert: CircleAlert,
  'chevron-up': ChevronUp,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  wrench: Wrench,
  maximize: Maximize2,
  minimize: Minimize2,
}

type AnyIconName = ToolIconName | UiIconName

interface IconProps extends Omit<LucideProps, 'ref'> {
  name: string
}

function resolveIcon(name: string): LucideIcon {
  return (
    TOOL_ICON_MAP[name as ToolIconName] ??
    UI_ICON_MAP[name as UiIconName] ??
    Hash
  )
}

/**
 * 统一图标组件：工具卡片 / 页面标题 / 通用 UI
 */
export function ToolIcon({ name, size = 20, strokeWidth = 1.85, ...rest }: IconProps) {
  const Icon = resolveIcon(name)
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden {...rest} />
}

/**
 * 通用 UI 图标（语义别名，内部仍走 ToolIcon）
 */
export function UiIcon({ name, size = 16, strokeWidth = 2, ...rest }: Omit<IconProps, 'name'> & { name: UiIconName }) {
  return <ToolIcon name={name} size={size} strokeWidth={strokeWidth} {...rest} />
}

export function isKnownIconName(name: string): name is AnyIconName {
  return name in TOOL_ICON_MAP || name in UI_ICON_MAP
}
