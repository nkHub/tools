/**
 * 哈希工具：MD5（spark-md5）+ SHA 系列（Web Crypto）
 * 支持文本与文件（ArrayBuffer）
 */

import SparkMD5 from 'spark-md5'

export type HashAlgo = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'

/** 将 ArrayBuffer 转为小写十六进制 */
export function bufferToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, '0')
  }
  return hex
}

/** 文本 → UTF-8 ArrayBuffer */
export function textToBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer
}

/** 计算 MD5（同步，基于 ArrayBuffer） */
export function md5Hex(data: ArrayBuffer): string {
  return SparkMD5.ArrayBuffer.hash(data)
}

/** 使用 Web Crypto 计算 SHA 系列 */
export async function shaHex(
  algo: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512',
  data: ArrayBuffer,
): Promise<string> {
  const digest = await crypto.subtle.digest(algo, data)
  return bufferToHex(digest)
}

/**
 * 对 ArrayBuffer 计算指定算法哈希
 */
export async function hashBuffer(algo: HashAlgo, data: ArrayBuffer): Promise<string> {
  if (algo === 'MD5') return md5Hex(data)
  return shaHex(algo, data)
}

/**
 * 对文本计算哈希
 */
export async function hashText(algo: HashAlgo, text: string): Promise<string> {
  return hashBuffer(algo, textToBuffer(text))
}

/** 全部算法列表 */
export const HASH_ALGOS: HashAlgo[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']
