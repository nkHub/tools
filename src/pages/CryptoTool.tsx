import { useState } from 'react'
import { Select } from '../components/Select'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'

/** 工作模式：对称 AES / 非对称 RSA */
type Mode = 'aes' | 'rsa'

/** 字节 ↔ Base64 */
function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < arr.length; i += chunk) {
    binary += String.fromCharCode(...arr.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const text = b64.replace(/\s+/g, '')
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

function bytesToText(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  return new TextDecoder().decode(arr)
}

/** 将 PEM 字符串转为 ArrayBuffer（去掉头尾与空白） */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')
  return base64ToBytes(b64).buffer as ArrayBuffer
}

function arrayBufferToPem(buf: ArrayBuffer, label: string): string {
  const b64 = bytesToBase64(buf)
  const lines = b64.match(/.{1,64}/g) ?? [b64]
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`
}

/**
 * 从口令派生 AES-GCM 密钥（PBKDF2 + SHA-256）
 */
async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textToBytes(password) as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * AES-GCM 加密：输出 salt(16) + iv(12) + ciphertext 的 Base64
 */
async function aesEncrypt(plaintext: string, password: string): Promise<string> {
  if (!password) throw new Error('请填写密钥 / 口令')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveAesKey(password, salt)
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textToBytes(plaintext) as BufferSource,
  )
  const packed = new Uint8Array(salt.length + iv.length + cipher.byteLength)
  packed.set(salt, 0)
  packed.set(iv, salt.length)
  packed.set(new Uint8Array(cipher), salt.length + iv.length)
  return bytesToBase64(packed)
}

/**
 * AES-GCM 解密：解析 salt + iv + ciphertext
 */
async function aesDecrypt(payload: string, password: string): Promise<string> {
  if (!password) throw new Error('请填写密钥 / 口令')
  const packed = base64ToBytes(payload)
  if (packed.length < 16 + 12 + 1) throw new Error('密文格式无效或过短')
  // 拷贝子视图，避免 SharedArrayBuffer 类型不兼容 BufferSource
  const salt = new Uint8Array(packed.subarray(0, 16))
  const iv = new Uint8Array(packed.subarray(16, 28))
  const data = new Uint8Array(packed.subarray(28))
  const key = await deriveAesKey(password, salt)
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      data as BufferSource,
    )
    return bytesToText(plain)
  } catch {
    throw new Error('解密失败：密钥错误或密文已损坏')
  }
}

/** 生成 RSA-OAEP 2048 密钥对（PEM） */
async function generateRsaKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt'],
  )
  const spki = await crypto.subtle.exportKey('spki', pair.publicKey)
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', pair.privateKey)
  return {
    publicKey: arrayBufferToPem(spki, 'PUBLIC KEY'),
    privateKey: arrayBufferToPem(pkcs8, 'PRIVATE KEY'),
  }
}

async function importRsaPublicKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(pem),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  )
}

async function importRsaPrivateKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(pem),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt'],
  )
}

async function rsaEncrypt(plaintext: string, publicPem: string): Promise<string> {
  if (!publicPem.trim()) throw new Error('请填写公钥 PEM')
  const key = await importRsaPublicKey(publicPem)
  // RSA-OAEP 2048 + SHA-256 明文上限约 190 字节
  const data = textToBytes(plaintext)
  if (data.length > 190) {
    throw new Error('明文过长：RSA-OAEP 2048 单次加密建议 ≤ 190 字节，请分段或改用 AES')
  }
  const cipher = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, data as BufferSource)
  return bytesToBase64(cipher)
}

async function rsaDecrypt(ciphertext: string, privatePem: string): Promise<string> {
  if (!privatePem.trim()) throw new Error('请填写私钥 PEM')
  const key = await importRsaPrivateKey(privatePem)
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      key,
      base64ToBytes(ciphertext) as BufferSource,
    )
    return bytesToText(plain)
  } catch {
    throw new Error('解密失败：私钥不匹配或密文无效')
  }
}

/**
 * 对称 / 非对称加解密工具
 * - AES-256-GCM + PBKDF2 口令
 * - RSA-OAEP 2048 密钥对
 */
export function CryptoTool() {
  const [mode, setMode] = useState<Mode>('aes')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [password, setPassword] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { copy } = useCopyFeedback()

  async function run(action: 'encrypt' | 'decrypt') {
    setBusy(true)
    setError('')
    try {
      if (!input.trim()) throw new Error(action === 'encrypt' ? '请输入明文' : '请输入密文')
      let result = ''
      if (mode === 'aes') {
        result =
          action === 'encrypt'
            ? await aesEncrypt(input, password)
            : await aesDecrypt(input, password)
      } else {
        result =
          action === 'encrypt'
            ? await rsaEncrypt(input, publicKey)
            : await rsaDecrypt(input, privateKey)
      }
      setOutput(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败')
      setOutput('')
    } finally {
      setBusy(false)
    }
  }

  async function handleGenerateKeys() {
    setBusy(true)
    setError('')
    try {
      const pair = await generateRsaKeyPair()
      setPublicKey(pair.publicKey)
      setPrivateKey(pair.privateKey)
    } catch (e) {
      setError(e instanceof Error ? e.message : '密钥生成失败')
    } finally {
      setBusy(false)
    }
  }

  function handleSwap() {
    setInput(output)
    setOutput('')
    setError('')
  }

  return (
    <ToolPage
      title="对称 / 非对称加解密"
      description="AES-256-GCM（口令派生）与 RSA-OAEP 2048 加解密，基于 Web Crypto，全程本地。"
      badge="离线"
    >
      <div className="panel">
        <div className="toolbar">
          <Select
            value={mode}
            onChange={(v) => {
              setMode(v as Mode)
              setError('')
              setOutput('')
            }}
            aria-label="加密模式"
            style={{ minWidth: 180 }}
            options={[
              { value: 'aes', label: '对称 · AES-256-GCM' },
              { value: 'rsa', label: '非对称 · RSA-OAEP' },
            ]}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void run('encrypt')}
          >
            加密
          </button>
          <button type="button" className="btn" disabled={busy} onClick={() => void run('decrypt')}>
            解密
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleSwap} disabled={!output}>
            输出 → 输入
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => copy(output)}
            disabled={!output}
          >
            复制输出
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              setInput('')
              setOutput('')
              setError('')
            }}
          >
            清空
          </button>
        </div>
        {error ? <p className="status-error" style={{ marginTop: '0.65rem' }}>{error}</p> : null}
        <p className="status-info" style={{ marginTop: '0.65rem' }}>
          {mode === 'aes'
            ? 'AES：口令经 PBKDF2 派生密钥，密文为 Base64（含 salt + iv）。'
            : 'RSA：公钥加密 / 私钥解密；可本地生成 2048 位密钥对（PEM）。'}
        </p>
      </div>

      {mode === 'aes' ? (
        <div className="panel">
          <div className="field">
            <label>密钥 / 口令</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入口令（请妥善保管，无法找回）"
              autoComplete="off"
            />
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-head">
            <h2>RSA 密钥</h2>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void handleGenerateKeys()}
            >
              生成密钥对
            </button>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>公钥（加密用）</label>
              <textarea
                className="code-area"
                style={{ minHeight: 160 }}
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="-----BEGIN PUBLIC KEY-----"
                spellCheck={false}
              />
              <div className="toolbar" style={{ marginTop: '0.45rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => copy(publicKey)}
                  disabled={!publicKey}
                >
                  复制公钥
                </button>
              </div>
            </div>
            <div className="field">
              <label>私钥（解密用）</label>
              <textarea
                className="code-area"
                style={{ minHeight: 160 }}
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="-----BEGIN PRIVATE KEY-----"
                spellCheck={false}
              />
              <div className="toolbar" style={{ marginTop: '0.45rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => copy(privateKey)}
                  disabled={!privateKey}
                >
                  复制私钥
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>输入</h2>
          </div>
          <div className="field">
            <textarea
              className="code-area"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'aes' ? '明文或 Base64 密文…' : '明文或 Base64 密文…'}
              spellCheck={false}
            />
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <h2>输出</h2>
          </div>
          <div className="field">
            <textarea
              className="code-area"
              value={output}
              readOnly
              placeholder="结果将显示在这里…"
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </ToolPage>
  )
}
