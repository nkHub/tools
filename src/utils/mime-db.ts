/**
 * 常见扩展名 ↔ MIME 类型映射（纯前端离线查询）
 * 仅覆盖开发/办公常见类型，非完整 IANA 数据库
 */

/** 扩展名（小写，无点）→ MIME */
export const EXT_TO_MIME: Record<string, string> = {
  // 文本
  txt: 'text/plain',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  csv: 'text/csv',
  md: 'text/markdown',
  markdown: 'text/markdown',
  xml: 'application/xml',
  json: 'application/json',
  jsonc: 'application/json',
  yaml: 'application/yaml',
  yml: 'application/yaml',
  toml: 'application/toml',
  // 脚本
  js: 'text/javascript',
  mjs: 'text/javascript',
  cjs: 'text/javascript',
  ts: 'text/typescript',
  tsx: 'text/tsx',
  jsx: 'text/jsx',
  // 图片
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  heic: 'image/heic',
  // 音频
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  // 视频
  mp4: 'video/mp4',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  // 字体
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  eot: 'application/vnd.ms-fontobject',
  // 文档
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  rtf: 'application/rtf',
  // 压缩
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  tgz: 'application/gzip',
  bz2: 'application/x-bzip2',
  // 其它
  wasm: 'application/wasm',
  bin: 'application/octet-stream',
  exe: 'application/octet-stream',
  dll: 'application/octet-stream',
  dmg: 'application/x-apple-diskimage',
  iso: 'application/x-iso9660-image',
  apk: 'application/vnd.android.package-archive',
  ipa: 'application/octet-stream',
  sh: 'application/x-sh',
  bat: 'application/x-msdos-program',
  ps1: 'application/x-powershell',
  sql: 'application/sql',
  graphql: 'application/graphql',
  map: 'application/json',
  ics: 'text/calendar',
  vcf: 'text/vcard',
  epub: 'application/epub+zip',
  torrent: 'application/x-bittorrent',
}

/** 从文件名或扩展名提取小写扩展名（无点） */
export function extractExt(input: string): string {
  const s = input.trim().toLowerCase()
  if (!s) return ''
  // 完整路径/文件名
  const base = s.split(/[/\\]/).pop() ?? s
  const q = base.split('?')[0] ?? base
  const i = q.lastIndexOf('.')
  if (i <= 0 || i === q.length - 1) {
    // 无点或点开头：可能本身就是扩展名
    return q.replace(/^\./, '')
  }
  return q.slice(i + 1)
}

/** 按 MIME 反查扩展名列表 */
export function findExtsByMime(mime: string): string[] {
  const target = mime.trim().toLowerCase()
  if (!target) return []
  const result: string[] = []
  for (const [ext, m] of Object.entries(EXT_TO_MIME)) {
    if (m === target || m.startsWith(target)) result.push(ext)
  }
  return result
}

/** 模糊搜索 MIME 或扩展名 */
export function searchMime(query: string): Array<{ ext: string; mime: string }> {
  const q = query.trim().toLowerCase()
  if (!q) {
    return Object.entries(EXT_TO_MIME).map(([ext, mime]) => ({ ext, mime }))
  }
  const result: Array<{ ext: string; mime: string }> = []
  for (const [ext, mime] of Object.entries(EXT_TO_MIME)) {
    if (ext.includes(q) || mime.includes(q)) {
      result.push({ ext, mime })
    }
  }
  return result
}
