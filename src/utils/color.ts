/**
 * 颜色解析与格式互转工具函数
 * 支持 HEX / RGB(A) / HSL(A) / HSV / 常见 CSS 命名色
 */

/** 归一化后的 RGBA（通道 0–255，alpha 0–1） */
export interface RgbaColor {
  r: number
  g: number
  b: number
  a: number
}

/** HSL 表示（h 0–360，s/l 0–100，a 0–1） */
export interface HslColor {
  h: number
  s: number
  l: number
  a: number
}

/** HSV 表示（h 0–360，s/v 0–100，a 0–1） */
export interface HsvColor {
  h: number
  s: number
  v: number
  a: number
}

/** 各格式字符串输出 */
export interface ColorFormats {
  hex: string
  hexAlpha: string
  rgb: string
  rgba: string
  hsl: string
  hsla: string
  hsv: string
  css: string
}

/** 常见 CSS 命名色（小写）→ hex */
const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  aqua: '#00ffff',
  magenta: '#ff00ff',
  fuchsia: '#ff00ff',
  silver: '#c0c0c0',
  gray: '#808080',
  grey: '#808080',
  maroon: '#800000',
  olive: '#808000',
  purple: '#800080',
  teal: '#008080',
  navy: '#000080',
  orange: '#ffa500',
  pink: '#ffc0cb',
  lime: '#00ff00',
  transparent: '#00000000',
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function round(n: number, digits = 0) {
  const p = 10 ** digits
  return Math.round(n * p) / p
}

/** 将 0–255 通道转为两位 hex */
function toHexByte(n: number) {
  return clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
}

/**
 * 解析百分比或数字：
 * - "50%" → 相对 max 的比例
 * - "128" → 原值
 */
function parseChannel(raw: string, max: number): number {
  const t = raw.trim()
  if (t.endsWith('%')) {
    return clamp((parseFloat(t) / 100) * max, 0, max)
  }
  return clamp(parseFloat(t), 0, max)
}

/**
 * 解析 alpha：支持 0–1 小数或百分比
 */
function parseAlpha(raw: string | undefined, fallback = 1): number {
  if (raw == null || raw.trim() === '') return fallback
  const t = raw.trim()
  if (t.endsWith('%')) {
    return clamp(parseFloat(t) / 100, 0, 1)
  }
  const n = parseFloat(t)
  if (!Number.isFinite(n)) return fallback
  // 若写成 0–255 整数，按 /255 处理
  if (n > 1) return clamp(n / 255, 0, 1)
  return clamp(n, 0, 1)
}

/** RGB → HSL */
export function rgbToHsl(r: number, g: number, b: number, a = 1): HslColor {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
        break
      case gn:
        h = ((bn - rn) / d + 2) / 6
        break
      default:
        h = ((rn - gn) / d + 4) / 6
    }
  }

  return {
    h: round(h * 360, 1),
    s: round(s * 100, 1),
    l: round(l * 100, 1),
    a,
  }
}

/** RGB → HSV */
export function rgbToHsv(r: number, g: number, b: number, a = 1): HsvColor {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max

  if (d !== 0) {
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
        break
      case gn:
        h = ((bn - rn) / d + 2) / 6
        break
      default:
        h = ((rn - gn) / d + 4) / 6
    }
  }

  return {
    h: round(h * 360, 1),
    s: round(s * 100, 1),
    v: round(v * 100, 1),
    a,
  }
}

/** HSL → RGB */
export function hslToRgb(h: number, s: number, l: number, a = 1): RgbaColor {
  const hh = ((h % 360) + 360) % 360 / 360
  const ss = clamp(s, 0, 100) / 100
  const ll = clamp(l, 0, 100) / 100

  if (ss === 0) {
    const v = Math.round(ll * 255)
    return { r: v, g: v, b: v, a }
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }

  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss
  const p = 2 * ll - q

  return {
    r: Math.round(hue2rgb(p, q, hh + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hh) * 255),
    b: Math.round(hue2rgb(p, q, hh - 1 / 3) * 255),
    a,
  }
}

/** HSV → RGB */
export function hsvToRgb(h: number, s: number, v: number, a = 1): RgbaColor {
  const hh = ((h % 360) + 360) % 360 / 60
  const ss = clamp(s, 0, 100) / 100
  const vv = clamp(v, 0, 100) / 100
  const c = vv * ss
  const x = c * (1 - Math.abs((hh % 2) - 1))
  const m = vv - c

  let rp = 0
  let gp = 0
  let bp = 0
  if (hh >= 0 && hh < 1) {
    rp = c
    gp = x
  } else if (hh < 2) {
    rp = x
    gp = c
  } else if (hh < 3) {
    gp = c
    bp = x
  } else if (hh < 4) {
    gp = x
    bp = c
  } else if (hh < 5) {
    rp = x
    bp = c
  } else {
    rp = c
    bp = x
  }

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
    a,
  }
}

/** RGBA → HEX（含可选 alpha） */
export function rgbaToHex(r: number, g: number, b: number, a = 1, withAlpha = false): string {
  const base = `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`
  if (!withAlpha || a >= 1) return base.toUpperCase()
  return `${base}${toHexByte(a * 255)}`.toUpperCase()
}

/** 从 HEX 解析（#RGB / #RGBA / #RRGGBB / #RRGGBBAA） */
function parseHex(raw: string): RgbaColor | null {
  let hex = raw.trim()
  if (hex.startsWith('#')) hex = hex.slice(1)
  if (!/^[0-9a-fA-F]{3,8}$/.test(hex)) return null
  if (hex.length === 3 || hex.length === 4) {
    const r = parseInt(hex[0] + hex[0], 16)
    const g = parseInt(hex[1] + hex[1], 16)
    const b = parseInt(hex[2] + hex[2], 16)
    const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1
    return { r, g, b, a }
  }
  if (hex.length === 6 || hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
    return { r, g, b, a }
  }
  return null
}

/**
 * 从任意字符串解析颜色
 * 支持：#hex、rgb/rgba()、hsl/hsla()、hsv()、命名色
 */
export function parseColor(input: string): RgbaColor | null {
  const text = input.trim()
  if (!text) return null

  // 命名色
  const named = NAMED_COLORS[text.toLowerCase()]
  if (named) return parseHex(named)

  // HEX
  if (text.startsWith('#') || /^[0-9a-fA-F]{3,8}$/.test(text)) {
    return parseHex(text)
  }

  // rgb / rgba
  const rgbMatch = text.match(
    /^rgba?\(\s*([+\d.%eE-]+)\s*[,/\s]\s*([+\d.%eE-]+)\s*[,/\s]\s*([+\d.%eE-]+)(?:\s*[,/]\s*([+\d.%eE-]+))?\s*\)$/i,
  )
  if (rgbMatch) {
    return {
      r: Math.round(parseChannel(rgbMatch[1], 255)),
      g: Math.round(parseChannel(rgbMatch[2], 255)),
      b: Math.round(parseChannel(rgbMatch[3], 255)),
      a: parseAlpha(rgbMatch[4]),
    }
  }

  // hsl / hsla
  const hslMatch = text.match(
    /^hsla?\(\s*([+\d.%eE-]+)(?:deg)?\s*[,/\s]\s*([+\d.%eE-]+%?)\s*[,/\s]\s*([+\d.%eE-]+%?)(?:\s*[,/]\s*([+\d.%eE-]+%?))?\s*\)$/i,
  )
  if (hslMatch) {
    const h = parseFloat(hslMatch[1])
    const s = parseChannel(hslMatch[2], 100)
    const l = parseChannel(hslMatch[3], 100)
    const a = parseAlpha(hslMatch[4])
    if (!Number.isFinite(h)) return null
    return hslToRgb(h, s, l, a)
  }

  // hsv / hsva
  const hsvMatch = text.match(
    /^hsva?\(\s*([+\d.%eE-]+)(?:deg)?\s*[,/\s]\s*([+\d.%eE-]+%?)\s*[,/\s]\s*([+\d.%eE-]+%?)(?:\s*[,/]\s*([+\d.%eE-]+%?))?\s*\)$/i,
  )
  if (hsvMatch) {
    const h = parseFloat(hsvMatch[1])
    const s = parseChannel(hsvMatch[2], 100)
    const v = parseChannel(hsvMatch[3], 100)
    const a = parseAlpha(hsvMatch[4])
    if (!Number.isFinite(h)) return null
    return hsvToRgb(h, s, v, a)
  }

  return null
}

/** 由 RGBA 生成各常用格式字符串 */
export function formatColor(color: RgbaColor): ColorFormats {
  const { r, g, b, a } = color
  const hsl = rgbToHsl(r, g, b, a)
  const hsv = rgbToHsv(r, g, b, a)
  const hex = rgbaToHex(r, g, b, 1, false)
  const hexAlpha = rgbaToHex(r, g, b, a, true)
  const aStr = round(a, 3)

  const rgb = `rgb(${r}, ${g}, ${b})`
  const rgba = `rgba(${r}, ${g}, ${b}, ${aStr})`
  const hslStr = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
  const hslaStr = `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${aStr})`
  const hsvStr = `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`

  return {
    hex,
    hexAlpha,
    rgb,
    rgba,
    hsl: hslStr,
    hsla: hslaStr,
    hsv: hsvStr,
    css: a < 1 ? rgba : hex,
  }
}

/** 供 <input type="color"> 使用的 #RRGGBB（忽略 alpha） */
export function toColorInputValue(color: RgbaColor): string {
  return rgbaToHex(color.r, color.g, color.b, 1, false)
}
