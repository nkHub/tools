/**
 * 正则常用模板与语法速查（供 RegexTool 使用）
 */

export interface RegexTemplate {
  /** 分类 */
  category: string
  /** 显示名称 */
  name: string
  /** 正则源码（不含斜杠） */
  pattern: string
  /** 推荐 flags */
  flags: string
  /** 简短说明 */
  description: string
  /** 示例测试文本 */
  sample?: string
  /** 示例替换 */
  replacement?: string
}

export interface CheatItem {
  token: string
  meaning: string
}

export interface CheatSection {
  title: string
  items: CheatItem[]
}

/** 常用模板库 */
export const REGEX_TEMPLATES: RegexTemplate[] = [
  {
    category: '通用',
    name: '邮箱',
    pattern: String.raw`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}`,
    flags: 'g',
    description: '常见邮箱地址（非严格 RFC）',
    sample: '联系：alice@example.com 或 bob.smith@test.org',
  },
  {
    category: '通用',
    name: 'URL / 链接',
    pattern: String.raw`https?:\/\/[^\s<>"']+`,
    flags: 'gi',
    description: 'http / https 链接',
    sample: '文档 https://example.com/docs 与 http://localhost:5173/app',
  },
  {
    category: '通用',
    name: 'IPv4',
    pattern: String.raw`\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b`,
    flags: 'g',
    description: 'IPv4 地址',
    sample: '网关 192.168.1.1，DNS 8.8.8.8，错误 999.1.1.1',
  },
  {
    category: '中国',
    name: '手机号',
    pattern: String.raw`(?:\+?86[-\s]?)?1[3-9]\d{9}`,
    flags: 'g',
    description: '中国大陆手机号（可选 +86）',
    sample: '手机 13800138000，国际 +86 13912345678',
  },
  {
    category: '中国',
    name: '身份证号',
    pattern: String.raw`\b[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b`,
    flags: 'g',
    description: '18 位身份证号（粗校验）',
    sample: '证件 110105199003074477',
  },
  {
    category: '中国',
    name: '中文字符',
    pattern: String.raw`[\u4e00-\u9fff]+`,
    flags: 'g',
    description: '连续汉字',
    sample: 'Hello 世界，正则表达式 test',
  },
  {
    category: '开发',
    name: 'UUID',
    pattern: String.raw`\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\b`,
    flags: 'g',
    description: '标准 UUID',
    sample: 'id=550e8400-e29b-41d4-a716-446655440000',
  },
  {
    category: '开发',
    name: 'HEX 颜色',
    pattern: String.raw`#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b`,
    flags: 'g',
    description: '3/4/6/8 位十六进制颜色',
    sample: 'color: #38bdf8; border: #fff; alpha #38bdf880',
  },
  {
    category: '开发',
    name: '日期 YYYY-MM-DD',
    pattern: String.raw`\b\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b`,
    flags: 'g',
    description: 'ISO 日期粗匹配',
    sample: '发布 2026-07-22，无效 2026-13-01',
  },
  {
    category: '开发',
    name: '时间 HH:mm:ss',
    pattern: String.raw`\b(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\b`,
    flags: 'g',
    description: '24 小时制时间',
    sample: '开始 09:30:00 结束 18:45:59',
  },
  {
    category: '文本',
    name: '行首空白',
    pattern: String.raw`^[ \t]+`,
    flags: 'gm',
    description: '匹配每行开头的空格/Tab',
    sample: '  indented\n\talso\nno indent',
    replacement: '',
  },
  {
    category: '文本',
    name: '多余空白',
    pattern: String.raw`[ \t]{2,}`,
    flags: 'g',
    description: '连续两个及以上空格/Tab',
    sample: 'a  b   c\td',
    replacement: ' ',
  },
  {
    category: '文本',
    name: '空行',
    pattern: String.raw`^\s*$`,
    flags: 'gm',
    description: '仅空白的行',
    sample: 'line1\n\n  \nline2',
  },
  {
    category: '文本',
    name: 'HTML 标签',
    pattern: String.raw`<\/?[A-Za-z][^>]*>`,
    flags: 'g',
    description: '简单 HTML 标签剥离用',
    sample: '<p class="x">Hello <b>world</b></p>',
    replacement: '',
  },
  {
    category: '捕获',
    name: '键值对',
    pattern: String.raw`(\w+)\s*=\s*(".*?"|'.*?'|\S+)`,
    flags: 'g',
    description: 'key=value，值可带引号',
    sample: 'name="Alice" age=30 city=Shanghai',
  },
  {
    category: '捕获',
    name: '命名分组邮箱',
    pattern: String.raw`(?<user>[A-Za-z0-9._%+-]+)@(?<domain>[A-Za-z0-9.-]+\.[A-Za-z]{2,})`,
    flags: 'g',
    description: '命名捕获 user / domain',
    sample: 'mail: dev@example.com',
  },
]

/** 语法速查 */
export const REGEX_CHEATSHEET: CheatSection[] = [
  {
    title: '字符类',
    items: [
      { token: '.', meaning: '任意字符（默认不含换行；s 标志下含换行）' },
      { token: '\\d', meaning: '数字 [0-9]' },
      { token: '\\D', meaning: '非数字' },
      { token: '\\w', meaning: '单词字符 [A-Za-z0-9_]' },
      { token: '\\W', meaning: '非单词字符' },
      { token: '\\s', meaning: '空白（空格/Tab/换行等）' },
      { token: '\\S', meaning: '非空白' },
      { token: '[abc]', meaning: 'a、b 或 c 之一' },
      { token: '[^abc]', meaning: '非 a/b/c' },
      { token: '[a-z]', meaning: '范围' },
    ],
  },
  {
    title: '锚点与边界',
    items: [
      { token: '^', meaning: '行/字符串开头（m 下为行首）' },
      { token: '$', meaning: '行/字符串结尾（m 下为行尾）' },
      { token: '\\b', meaning: '单词边界' },
      { token: '\\B', meaning: '非单词边界' },
    ],
  },
  {
    title: '量词',
    items: [
      { token: '*', meaning: '0 次或多次（贪婪）' },
      { token: '+', meaning: '1 次或多次（贪婪）' },
      { token: '?', meaning: '0 或 1 次' },
      { token: '{n}', meaning: '恰好 n 次' },
      { token: '{n,}', meaning: '至少 n 次' },
      { token: '{n,m}', meaning: 'n 到 m 次' },
      { token: '*?', meaning: '惰性：尽可能少' },
      { token: '+?', meaning: '惰性一次以上' },
    ],
  },
  {
    title: '分组与引用',
    items: [
      { token: '(...)', meaning: '捕获组' },
      { token: '(?:...)', meaning: '非捕获组' },
      { token: '(?<name>...)', meaning: '命名捕获组' },
      { token: '\\1 / $1', meaning: '反向引用 / 替换中的组' },
      { token: '$&', meaning: '替换中的完整匹配' },
      { token: '$$', meaning: '字面量 $' },
    ],
  },
  {
    title: '断言（环视）',
    items: [
      { token: '(?=...)', meaning: '正向前瞻' },
      { token: '(?!...)', meaning: '负向前瞻' },
      { token: '(?<=...)', meaning: '正向后顾' },
      { token: '(?<!...)', meaning: '负向后顾' },
    ],
  },
  {
    title: '标志 flags',
    items: [
      { token: 'g', meaning: '全局匹配' },
      { token: 'i', meaning: '忽略大小写' },
      { token: 'm', meaning: '多行：^ $ 匹配行界' },
      { token: 's', meaning: 'dotAll：. 匹配换行' },
      { token: 'u', meaning: 'Unicode 模式' },
      { token: 'y', meaning: '粘性：从 lastIndex 开始' },
    ],
  },
]
