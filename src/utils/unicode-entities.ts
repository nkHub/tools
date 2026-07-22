/**
 * Unicode / HTML 实体编解码（纯前端）
 */

/** 常用命名实体（双向） */
export const NAMED_ENTITIES: Array<{ name: string; char: string; desc: string }> = [
  { name: 'nbsp', char: '\u00A0', desc: '不间断空格' },
  { name: 'lt', char: '<', desc: '小于号' },
  { name: 'gt', char: '>', desc: '大于号' },
  { name: 'amp', char: '&', desc: '和号' },
  { name: 'quot', char: '"', desc: '双引号' },
  { name: 'apos', char: "'", desc: '单引号' },
  { name: 'copy', char: '©', desc: '版权' },
  { name: 'reg', char: '®', desc: '注册商标' },
  { name: 'trade', char: '™', desc: '商标' },
  { name: 'euro', char: '€', desc: '欧元' },
  { name: 'pound', char: '£', desc: '英镑' },
  { name: 'yen', char: '¥', desc: '日元' },
  { name: 'cent', char: '¢', desc: '分' },
  { name: 'sect', char: '§', desc: '章节' },
  { name: 'para', char: '¶', desc: '段落' },
  { name: 'middot', char: '·', desc: '间隔号' },
  { name: 'bull', char: '•', desc: '项目符号' },
  { name: 'hellip', char: '…', desc: '省略号' },
  { name: 'ndash', char: '–', desc: '短破折号' },
  { name: 'mdash', char: '—', desc: '长破折号' },
  { name: 'lsquo', char: '‘', desc: '左单引号' },
  { name: 'rsquo', char: '’', desc: '右单引号' },
  { name: 'ldquo', char: '“', desc: '左双引号' },
  { name: 'rdquo', char: '”', desc: '右双引号' },
  { name: 'laquo', char: '«', desc: '左书名号式引号' },
  { name: 'raquo', char: '»', desc: '右书名号式引号' },
  { name: 'times', char: '×', desc: '乘号' },
  { name: 'divide', char: '÷', desc: '除号' },
  { name: 'plusmn', char: '±', desc: '正负号' },
  { name: 'ne', char: '≠', desc: '不等于' },
  { name: 'le', char: '≤', desc: '小于等于' },
  { name: 'ge', char: '≥', desc: '大于等于' },
  { name: 'infin', char: '∞', desc: '无穷' },
  { name: 'deg', char: '°', desc: '度' },
  { name: 'micro', char: 'µ', desc: '微' },
  { name: 'alpha', char: 'α', desc: '希腊 alpha' },
  { name: 'beta', char: 'β', desc: '希腊 beta' },
  { name: 'pi', char: 'π', desc: '希腊 pi' },
  { name: 'Omega', char: 'Ω', desc: '希腊 Omega' },
  { name: 'spades', char: '♠', desc: '黑桃' },
  { name: 'clubs', char: '♣', desc: '梅花' },
  { name: 'hearts', char: '♥', desc: '红心' },
  { name: 'diams', char: '♦', desc: '方片' },
  { name: 'star', char: '★', desc: '实心星' },
  { name: 'check', char: '✓', desc: '勾选' },
  { name: 'cross', char: '✗', desc: '叉号' },
  { name: 'arrow', char: '→', desc: '右箭头' },
  { name: 'larr', char: '←', desc: '左箭头' },
  { name: 'uarr', char: '↑', desc: '上箭头' },
  { name: 'darr', char: '↓', desc: '下箭头' },
]

const CHAR_TO_NAME = new Map(NAMED_ENTITIES.map((e) => [e.char, e.name]))
const NAME_TO_CHAR = new Map(NAMED_ENTITIES.map((e) => [e.name.toLowerCase(), e.char]))

export type HtmlEncodeMode = 'minimal' | 'named' | 'decimal' | 'hex'

/**
 * HTML 实体编码
 * - minimal: & < > " '
 * - named: 优先命名实体，其余非 ASCII 用十进制
 * - decimal: 全部非安全字符 → &#N;
 * - hex: 全部非安全字符 → &#xH;
 */
export function encodeHtml(text: string, mode: HtmlEncodeMode = 'minimal'): string {
  if (!text) return ''
  let out = ''
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    if (mode === 'minimal') {
      switch (ch) {
        case '&':
          out += '&amp;'
          break
        case '<':
          out += '&lt;'
          break
        case '>':
          out += '&gt;'
          break
        case '"':
          out += '&quot;'
          break
        case "'":
          out += '&#39;'
          break
        default:
          out += ch
      }
      continue
    }

    if (mode === 'named') {
      const named = CHAR_TO_NAME.get(ch)
      if (named) {
        out += `&${named};`
        continue
      }
      if (ch === '&' || ch === '<' || ch === '>' || ch === '"' || ch === "'") {
        // 兜底
        out += encodeHtml(ch, 'minimal')
        continue
      }
      if (cp > 0x7f) {
        out += `&#${cp};`
        continue
      }
      out += ch
      continue
    }

    // decimal / hex：编码控制符与特殊字符 + 非 ASCII
    const need =
      ch === '&' ||
      ch === '<' ||
      ch === '>' ||
      ch === '"' ||
      ch === "'" ||
      cp < 0x20 ||
      cp === 0x7f ||
      cp > 0x7f
    if (!need) {
      out += ch
      continue
    }
    out += mode === 'hex' ? `&#x${cp.toString(16).toUpperCase()};` : `&#${cp};`
  }
  return out
}

/**
 * HTML 实体解码（命名 + 十进制 + 十六进制）
 */
export function decodeHtml(text: string): string {
  if (!text) return ''
  return text.replace(
    /&(?:#x([0-9a-fA-F]+)|#(\d+)|([a-zA-Z][a-zA-Z0-9]+));/g,
    (full, hex: string | undefined, dec: string | undefined, name: string | undefined) => {
      if (hex) {
        const cp = Number.parseInt(hex, 16)
        if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return full
        try {
          return String.fromCodePoint(cp)
        } catch {
          return full
        }
      }
      if (dec) {
        const cp = Number.parseInt(dec, 10)
        if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return full
        try {
          return String.fromCodePoint(cp)
        } catch {
          return full
        }
      }
      if (name) {
        const ch = NAME_TO_CHAR.get(name.toLowerCase())
        if (ch) return ch
        // 浏览器常见额外命名：用 textarea 技巧不依赖 DOM 的有限表；未知则保留
        return full
      }
      return full
    },
  )
}

export type UnicodeEscapeStyle = 'js' | 'js-braced' | 'css' | 'python' | 'utf8-hex'

/**
 * Unicode 转义编码
 */
export function encodeUnicodeEscape(text: string, style: UnicodeEscapeStyle): string {
  if (!text) return ''
  if (style === 'utf8-hex') {
    const bytes = new TextEncoder().encode(text)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
  }

  let out = ''
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    switch (style) {
      case 'js':
        if (cp <= 0xffff) {
          out += `\\u${cp.toString(16).padStart(4, '0')}`
        } else {
          // UTF-16 代理对
          const offset = cp - 0x10000
          const hi = 0xd800 + (offset >> 10)
          const lo = 0xdc00 + (offset & 0x3ff)
          out += `\\u${hi.toString(16).padStart(4, '0')}\\u${lo.toString(16).padStart(4, '0')}`
        }
        break
      case 'js-braced':
        out += `\\u{${cp.toString(16)}}`
        break
      case 'css':
        out += `\\${cp.toString(16)} `
        break
      case 'python':
        out += cp <= 0xffff ? `\\u${cp.toString(16).padStart(4, '0')}` : `\\U${cp.toString(16).padStart(8, '0')}`
        break
      default:
        out += ch
    }
  }
  return out
}

/**
 * Unicode 转义解码（尽量宽容）
 */
export function decodeUnicodeEscape(text: string): string {
  if (!text) return ''
  let s = text

  // \u{...}
  s = s.replace(/\\u\{([0-9a-fA-F]{1,6})\}/g, (_, hex: string) => {
    const cp = Number.parseInt(hex, 16)
    try {
      return String.fromCodePoint(cp)
    } catch {
      return _
    }
  })

  // \UXXXXXXXX (Python)
  s = s.replace(/\\U([0-9a-fA-F]{8})/g, (_, hex: string) => {
    const cp = Number.parseInt(hex, 16)
    try {
      return String.fromCodePoint(cp)
    } catch {
      return _
    }
  })

  // \uXXXX 与代理对
  s = s.replace(/\\u([0-9a-fA-F]{4})(?:\\u([0-9a-fA-F]{4}))?/g, (full, a: string, b?: string) => {
    const hi = Number.parseInt(a, 16)
    if (b && hi >= 0xd800 && hi <= 0xdbff) {
      const lo = Number.parseInt(b, 16)
      if (lo >= 0xdc00 && lo <= 0xdfff) {
        const cp = ((hi - 0xd800) << 10) + (lo - 0xdc00) + 0x10000
        return String.fromCodePoint(cp)
      }
    }
    try {
      return String.fromCodePoint(hi)
    } catch {
      return full
    }
  })

  // \xHH
  s = s.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  )

  // CSS \hhhhhh（后跟空格或结束）
  s = s.replace(/\\([0-9a-fA-F]{1,6})(?:\s)?/g, (full, hex: string) => {
    // 避免误伤已处理完的普通反斜杠序列：仅当整段仍含 CSS 风格时
    if (full.startsWith('\\u') || full.startsWith('\\U') || full.startsWith('\\x')) return full
    const cp = Number.parseInt(hex, 16)
    try {
      return String.fromCodePoint(cp)
    } catch {
      return full
    }
  })

  // UTF-8 hex 字节串：仅当整串像 hex 时
  const compact = text.replace(/[\s,]+/g, '')
  if (/^[0-9a-fA-F]{2,}$/.test(compact) && compact.length % 2 === 0 && !/[\\&]/.test(text)) {
    try {
      const bytes = new Uint8Array(compact.length / 2)
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Number.parseInt(compact.slice(i * 2, i * 2 + 2), 16)
      }
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
      // fall through
    }
  }

  return s
}

export interface CodePointInfo {
  /** 显示用字符（代理对合并后） */
  char: string
  /** 码点 */
  codePoint: number
  /** U+XXXX */
  unicode: string
  /** 十进制 */
  decimal: string
  /** UTF-16 code units hex */
  utf16: string
  /** UTF-8 bytes hex */
  utf8: string
  /** HTML 十进制实体 */
  htmlDec: string
  /** HTML 十六进制实体 */
  htmlHex: string
  /** 命名实体（若有） */
  htmlName: string | null
  /** 索引（在字符串中的码点序号） */
  index: number
}

/**
 * 逐码点分析字符串
 */
export function inspectCodePoints(text: string, limit = 500): CodePointInfo[] {
  const list: CodePointInfo[] = []
  let i = 0
  for (const ch of text) {
    if (list.length >= limit) break
    const cp = ch.codePointAt(0)!
    const utf8 = Array.from(new TextEncoder().encode(ch), (b) =>
      b.toString(16).padStart(2, '0').toUpperCase(),
    ).join(' ')
    const utf16Units: string[] = []
    for (let j = 0; j < ch.length; j++) {
      utf16Units.push(ch.charCodeAt(j).toString(16).padStart(4, '0').toUpperCase())
    }
    const named = CHAR_TO_NAME.get(ch)
    list.push({
      char: ch,
      codePoint: cp,
      unicode: `U+${cp.toString(16).toUpperCase().padStart(cp > 0xffff ? 5 : 4, '0')}`,
      decimal: String(cp),
      utf16: utf16Units.join(' '),
      utf8,
      htmlDec: `&#${cp};`,
      htmlHex: `&#x${cp.toString(16).toUpperCase()};`,
      htmlName: named ? `&${named};` : null,
      index: i,
    })
    i++
  }
  return list
}

/** 码点总数（非 UTF-16 单元） */
export function countCodePoints(text: string): number {
  let n = 0
  for (const _ of text) n++
  return n
}
