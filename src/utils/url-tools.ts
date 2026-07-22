/**
 * URL 编解码与查询参数解析
 */

export interface ParsedUrlParts {
  /** 是否成功用 URL 构造解析 */
  ok: boolean
  error: string
  href: string
  protocol: string
  username: string
  password: string
  host: string
  hostname: string
  port: string
  pathname: string
  search: string
  hash: string
  origin: string
}

export interface QueryPair {
  key: string
  value: string
  /** 原始未解码片段（可选） */
  raw?: string
}

/**
 * 解析完整 URL；非法时返回 ok=false
 */
export function parseUrl(input: string): ParsedUrlParts {
  const text = input.trim()
  const empty: ParsedUrlParts = {
    ok: false,
    error: text ? '' : '',
    href: '',
    protocol: '',
    username: '',
    password: '',
    host: '',
    hostname: '',
    port: '',
    pathname: '',
    search: '',
    hash: '',
    origin: '',
  }

  if (!text) return empty

  try {
    // 无协议时补 https 便于解析相对风格输入
    const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(text)
    const url = new URL(hasScheme ? text : `https://${text}`)
    return {
      ok: true,
      error: '',
      href: url.href,
      protocol: url.protocol,
      username: url.username,
      password: url.password,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      origin: url.origin,
    }
  } catch (e) {
    return {
      ...empty,
      error: e instanceof Error ? e.message : 'URL 解析失败',
    }
  }
}

/**
 * 解析 query 字符串（可带或不带 ?）
 * 支持重复 key
 */
export function parseQuery(search: string): QueryPair[] {
  let s = search.trim()
  if (!s) return []
  if (s.startsWith('?')) s = s.slice(1)
  // 若传入完整 URL，只取 search 部分
  try {
    if (/^https?:\/\//i.test(s) || s.includes('://')) {
      const u = new URL(s)
      s = u.search.startsWith('?') ? u.search.slice(1) : u.search
    } else if (s.includes('?') && !s.includes('=')) {
      // path?query
      s = s.slice(s.indexOf('?') + 1)
    } else if (s.includes('?')) {
      const idx = s.indexOf('?')
      // 可能是 host/path?query
      s = s.slice(idx + 1)
    }
  } catch {
    // 按纯 query 继续
  }

  // 去掉 hash
  const hashIdx = s.indexOf('#')
  if (hashIdx >= 0) s = s.slice(0, hashIdx)

  if (!s) return []

  const pairs: QueryPair[] = []
  for (const part of s.split('&')) {
    if (!part) continue
    const eq = part.indexOf('=')
    let rawKey: string
    let rawVal: string
    if (eq < 0) {
      rawKey = part
      rawVal = ''
    } else {
      rawKey = part.slice(0, eq)
      rawVal = part.slice(eq + 1)
    }
    pairs.push({
      key: safeDecode(rawKey),
      value: safeDecode(rawVal),
      raw: part,
    })
  }
  return pairs
}

/** 安全 decodeURIComponent，失败则原样返回 */
export function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '))
  } catch {
    return s
  }
}

/**
 * 将键值对序列化为 query（encodeURIComponent）
 */
export function buildQuery(pairs: QueryPair[], withQuestion = true): string {
  const body = pairs
    .filter((p) => p.key !== '' || p.value !== '')
    .map((p) => {
      const k = encodeURIComponent(p.key)
      const v = encodeURIComponent(p.value)
      return p.value === '' && p.key !== '' ? `${k}=` : `${k}=${v}`
    })
    .join('&')
  if (!body) return ''
  return withQuestion ? `?${body}` : body
}

/** encodeURIComponent 封装（保留空串） */
export function encodeComponent(text: string): string {
  return encodeURIComponent(text)
}

/** decodeURIComponent 封装 */
export function decodeComponent(text: string): string {
  return safeDecode(text)
}

/**
 * encodeURI：编码完整 URI，保留协议与保留字符
 */
export function encodeFullUri(text: string): string {
  return encodeURI(text)
}

export function decodeFullUri(text: string): string {
  try {
    return decodeURI(text)
  } catch {
    return text
  }
}
