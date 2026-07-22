/**
 * JWT 纯本地解析（不验证签名）
 * 将 header / payload 按 base64url 解码为 JSON
 */

export interface JwtParts {
  /** 原始三段 */
  raw: { header: string; payload: string; signature: string }
  /** 解析后的 header 对象 */
  header: Record<string, unknown> | null
  /** 解析后的 payload 对象 */
  payload: Record<string, unknown> | null
  /** 解析错误信息 */
  error: string
  /** 是否格式完整（三段） */
  validFormat: boolean
}

/** base64url → UTF-8 字符串 */
export function base64UrlDecode(input: string): string {
  // 还原标准 base64
  let b64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4
  if (pad === 2) b64 += '=='
  else if (pad === 3) b64 += '='
  else if (pad === 1) throw new Error('非法 base64url 长度')

  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

/** 尝试解析 JSON */
function tryParseJson(text: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(text) as unknown
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return v as Record<string, unknown>
    }
    return { value: v } as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * 解析 JWT 字符串
 */
export function parseJwt(token: string): JwtParts {
  const trimmed = token.trim()
  if (!trimmed) {
    return {
      raw: { header: '', payload: '', signature: '' },
      header: null,
      payload: null,
      error: '',
      validFormat: false,
    }
  }

  const parts = trimmed.split('.')
  if (parts.length !== 3) {
    return {
      raw: {
        header: parts[0] ?? '',
        payload: parts[1] ?? '',
        signature: parts.slice(2).join('.') || '',
      },
      header: null,
      payload: null,
      error: `JWT 应为 3 段（header.payload.signature），当前 ${parts.length} 段`,
      validFormat: false,
    }
  }

  const [h, p, s] = parts as [string, string, string]
  let header: Record<string, unknown> | null = null
  let payload: Record<string, unknown> | null = null
  const errors: string[] = []

  try {
    const headerText = base64UrlDecode(h)
    header = tryParseJson(headerText)
    if (!header) errors.push('Header 不是合法 JSON')
  } catch (e) {
    errors.push(`Header 解码失败：${e instanceof Error ? e.message : String(e)}`)
  }

  try {
    const payloadText = base64UrlDecode(p)
    payload = tryParseJson(payloadText)
    if (!payload) errors.push('Payload 不是合法 JSON')
  } catch (e) {
    errors.push(`Payload 解码失败：${e instanceof Error ? e.message : String(e)}`)
  }

  return {
    raw: { header: h, payload: p, signature: s },
    header,
    payload,
    error: errors.join('；'),
    validFormat: errors.length === 0,
  }
}

/** 格式化时间戳 claim（exp/iat/nbf） */
export function formatJwtTime(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  // JWT 时间戳一般为秒
  const ms = value < 1e12 ? value * 1000 : value
  try {
    return new Date(ms).toISOString()
  } catch {
    return null
  }
}

/** 常见 claim 中文说明 */
export const JWT_CLAIM_LABELS: Record<string, string> = {
  iss: '签发者 (iss)',
  sub: '主题 (sub)',
  aud: '受众 (aud)',
  exp: '过期时间 (exp)',
  nbf: '生效时间 (nbf)',
  iat: '签发时间 (iat)',
  jti: '唯一标识 (jti)',
  alg: '算法 (alg)',
  typ: '类型 (typ)',
  kid: '密钥 ID (kid)',
}
