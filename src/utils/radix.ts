/**
 * 进制转换工具函数
 * 支持 2–36 进制整数互转，以及字节十六进制展示
 */

/** 合法进制范围 */
export const RADIX_MIN = 2
export const RADIX_MAX = 36

/**
 * 规范化进制输入字符串：去空白、可选 0x/0b/0o 前缀
 */
export function stripRadixPrefix(raw: string, radix: number): string {
  let s = raw.trim().replace(/\s+/g, '')
  if (!s) return ''

  // 自动识别常见前缀（仅当目标进制匹配时剥离）
  if (/^0x/i.test(s) && (radix === 16 || radix === 0)) {
    s = s.slice(2)
  } else if (/^0b/i.test(s) && (radix === 2 || radix === 0)) {
    s = s.slice(2)
  } else if (/^0o/i.test(s) && (radix === 8 || radix === 0)) {
    s = s.slice(2)
  }

  return s
}

/**
 * 校验某字符在指定进制下是否合法
 */
function isValidDigit(ch: string, radix: number): boolean {
  const c = ch.toLowerCase()
  if (c >= '0' && c <= '9') return Number(c) < radix
  if (c >= 'a' && c <= 'z') return c.charCodeAt(0) - 97 + 10 < radix
  return false
}

/**
 * 解析任意进制字符串为 bigint（支持负号）
 */
export function parseRadix(raw: string, radix: number): { value: bigint; error: string } {
  if (radix < RADIX_MIN || radix > RADIX_MAX) {
    return { value: 0n, error: `进制须在 ${RADIX_MIN}–${RADIX_MAX}` }
  }

  let s = stripRadixPrefix(raw, radix)
  if (!s) return { value: 0n, error: '' }

  let negative = false
  if (s.startsWith('-')) {
    negative = true
    s = s.slice(1)
  } else if (s.startsWith('+')) {
    s = s.slice(1)
  }

  if (!s) return { value: 0n, error: '无效数字' }

  // 去掉千分位下划线
  s = s.replace(/_/g, '')

  for (const ch of s) {
    if (!isValidDigit(ch, radix)) {
      return { value: 0n, error: `字符「${ch}」在 ${radix} 进制下非法` }
    }
  }

  try {
    // 手工解析以兼容任意进制（BigInt 仅原生支持 0b/0o/0x/十进制）
    let acc = 0n
    const base = BigInt(radix)
    for (const ch of s.toLowerCase()) {
      const digit =
        ch >= '0' && ch <= '9' ? BigInt(ch.charCodeAt(0) - 48) : BigInt(ch.charCodeAt(0) - 97 + 10)
      acc = acc * base + digit
    }
    return { value: negative ? -acc : acc, error: '' }
  } catch {
    return { value: 0n, error: '解析失败' }
  }
}

/**
 * bigint → 指定进制字符串（小写字母，负号前缀）
 */
export function formatRadix(value: bigint, radix: number, upper = false): string {
  if (radix < RADIX_MIN || radix > RADIX_MAX) return ''
  if (value === 0n) return '0'

  const negative = value < 0n
  let n = negative ? -value : value
  const base = BigInt(radix)
  const digits = '0123456789abcdefghijklmnopqrstuvwxyz'
  let out = ''

  while (n > 0n) {
    const rem = Number(n % base)
    out = digits[rem] + out
    n = n / base
  }

  if (upper) out = out.toUpperCase()
  return negative ? `-${out}` : out
}

/** 常用进制快捷标签 */
export const COMMON_RADICES: Array<{ radix: number; label: string; prefix: string }> = [
  { radix: 2, label: '二进制', prefix: '0b' },
  { radix: 8, label: '八进制', prefix: '0o' },
  { radix: 10, label: '十进制', prefix: '' },
  { radix: 16, label: '十六进制', prefix: '0x' },
  { radix: 32, label: '三十二进制', prefix: '' },
  { radix: 36, label: '三十六进制', prefix: '' },
]

/**
 * 将非负 bigint 按字节拆成十六进制字节串（大端，至少 1 字节）
 */
export function bigintToHexBytes(value: bigint): string {
  let n = value < 0n ? -value : value
  if (n === 0n) return '00'
  const bytes: string[] = []
  while (n > 0n) {
    const b = Number(n & 0xffn)
    bytes.unshift(b.toString(16).padStart(2, '0'))
    n >>= 8n
  }
  return bytes.join(' ')
}
