/**
 * JWT 纯本地解析与签名校验（Web Crypto）
 * 支持 HS256/384/512 对称密钥，以及 RS256/384/512 公钥 PEM
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

export type JwtVerifyStatus =
  | 'idle'
  | 'unsupported'
  | 'missing_key'
  | 'invalid'
  | 'valid'
  | 'error'

export interface JwtVerifyResult {
  status: JwtVerifyStatus
  /** 展示文案 */
  message: string
  /** 使用的算法 */
  alg?: string
}

/** base64url → UTF-8 字符串 */
export function base64UrlDecode(input: string): string {
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

/** base64url → 原始字节 */
export function base64UrlToBytes(input: string): Uint8Array {
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
  return bytes
}

/** 字节 → base64url（无 padding） */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
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

const HS_MAP: Record<string, { name: string; length: number }> = {
  HS256: { name: 'SHA-256', length: 256 },
  HS384: { name: 'SHA-384', length: 384 },
  HS512: { name: 'SHA-512', length: 512 },
}

const RS_MAP: Record<string, { name: string; hash: string }> = {
  RS256: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
  RS384: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-384' },
  RS512: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}

/** 去掉 PEM 头尾，得到 DER base64 */
function pemToBinary(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')
  if (!cleaned) throw new Error('公钥 PEM 为空')
  const binary = atob(cleaned)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * 校验 JWT 签名
 * @param token 完整 JWT
 * @param secretOrPem HS* 用共享密钥；RS* 用公钥 PEM（SPKI）
 */
export async function verifyJwt(token: string, secretOrPem: string): Promise<JwtVerifyResult> {
  const parsed = parseJwt(token)
  if (!parsed.validFormat || !parsed.header) {
    return {
      status: 'error',
      message: parsed.error || '无法解析 JWT，无法验签',
    }
  }

  const alg = String(parsed.header.alg ?? '')
  if (!alg) {
    return { status: 'error', message: 'Header 缺少 alg', alg }
  }

  if (alg === 'none') {
    const emptySig = !parsed.raw.signature
    return {
      status: emptySig ? 'valid' : 'invalid',
      message: emptySig
        ? '算法为 none，且无签名段（不安全，仅供调试）'
        : '算法为 none，但存在签名段，判定无效',
      alg,
    }
  }

  const keyMaterial = secretOrPem.trim()
  if (!keyMaterial) {
    return { status: 'missing_key', message: '请输入密钥或公钥后验签', alg }
  }

  const signingInput = `${parsed.raw.header}.${parsed.raw.payload}`
  const data = new TextEncoder().encode(signingInput)

  try {
    if (HS_MAP[alg]) {
      const { name, length } = HS_MAP[alg]
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(keyMaterial),
        { name: 'HMAC', hash: { name }, length },
        false,
        ['sign'],
      )
      const sigBuf = await crypto.subtle.sign('HMAC', key, data)
      const expected = new Uint8Array(sigBuf)
      const actual = base64UrlToBytes(parsed.raw.signature)
      const ok = timingSafeEqual(expected, actual)
      return {
        status: ok ? 'valid' : 'invalid',
        message: ok ? `签名有效（${alg}）` : `签名无效（${alg}）`,
        alg,
      }
    }

    if (RS_MAP[alg]) {
      const { name, hash } = RS_MAP[alg]
      let key: CryptoKey
      try {
        key = await crypto.subtle.importKey(
          'spki',
          pemToBinary(keyMaterial),
          { name, hash: { name: hash } },
          false,
          ['verify'],
        )
      } catch {
        return {
          status: 'error',
          message: '公钥导入失败：请粘贴 SPKI 格式 PEM（-----BEGIN PUBLIC KEY-----）',
          alg,
        }
      }
      const ok = await crypto.subtle.verify(
        name,
        key,
        base64UrlToBytes(parsed.raw.signature) as BufferSource,
        data,
      )
      return {
        status: ok ? 'valid' : 'invalid',
        message: ok ? `签名有效（${alg}）` : `签名无效（${alg}）`,
        alg,
      }
    }

    return {
      status: 'unsupported',
      message: `暂不支持算法 ${alg}（支持 HS256/384/512、RS256/384/512、none）`,
      alg,
    }
  } catch (e) {
    return {
      status: 'error',
      message: e instanceof Error ? e.message : '验签失败',
      alg,
    }
  }
}
