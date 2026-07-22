/**
 * 工具箱导航与首页卡片配置
 * 所有工具均为纯前端实现，数据不离开本机
 */

export interface ToolItem {
  /** 路由路径 */
  path: string
  /** 工具名称（卡片/页面完整名） */
  name: string
  /** 顶栏导航短名，缺省用 name */
  shortName?: string
  /** 简短描述 */
  description: string
  /** 分类 */
  category: string
  /** Lucide 图标名（见 ToolIcon） */
  icon: string
}

/** 全部工具列表 */
export const tools: ToolItem[] = [
  {
    path: '/json',
    name: 'JSON 工具',
    shortName: 'JSON',
    description: '格式化、压缩、校验，纯本地处理',
    category: '数据格式',
    icon: 'braces',
  },
  {
    path: '/yaml',
    name: 'YAML 工具',
    shortName: 'YAML',
    description: 'YAML 格式化、校验，与 JSON 互转',
    category: '数据格式',
    icon: 'file-code',
  },
  {
    path: '/base64',
    name: 'Base64 编解码',
    shortName: 'Base64',
    description: 'Base64 加密 / 解密，支持 UTF-8 与 URL-safe',
    category: '编码解码',
    icon: 'binary',
  },
  {
    path: '/url',
    name: 'URL 工具',
    shortName: 'URL',
    description: 'URL 解析、编解码与查询参数',
    category: '编码解码',
    icon: 'link',
  },
  {
    path: '/radix',
    name: '进制转换',
    shortName: '进制',
    description: '2–36 进制整数互转',
    category: '数据格式',
    icon: 'calculator',
  },
  {
    path: '/base64-image',
    name: 'Base64 图片互转',
    shortName: '图片B64',
    description: '图片 ↔ Base64，拖拽上传与预览下载',
    category: '编码解码',
    icon: 'image',
  },
  {
    path: '/base64-hex',
    name: 'Base64 / Hex 文件',
    shortName: 'B64/Hex',
    description: '任意文件与 Base64、Hex 文本互转下载',
    category: '编码解码',
    icon: 'package',
  },
  {
    path: '/color',
    name: '颜色代码转换',
    shortName: '颜色',
    description: 'HEX / RGB / HSL / HSV 互转与预览',
    category: '设计开发',
    icon: 'palette',
  },
  {
    path: '/palette',
    name: '调色板',
    shortName: '调色板',
    description: '配色方案生成，支持链接导入基准色',
    category: '设计开发',
    icon: 'swatch-book',
  },
  {
    path: '/image-color',
    name: '图片取色',
    shortName: '取色',
    description: '点击取色、主色提取，联动调色板 / 渐变',
    category: '设计开发',
    icon: 'pipette',
  },
  {
    path: '/gradient',
    name: '渐变生成器',
    shortName: '渐变',
    description: '线性 / 径向渐变可视化，导出 CSS',
    category: '设计开发',
    icon: 'blend',
  },
  {
    path: '/regex',
    name: '正则表达式',
    shortName: '正则',
    description: '匹配/替换、常用模板库与语法速查',
    category: '文本处理',
    icon: 'regex',
  },
  {
    path: '/unicode',
    name: 'Unicode / HTML 实体',
    shortName: 'Unicode',
    description: '实体编解码、转义与码点检视',
    category: '文本处理',
    icon: 'case-sensitive',
  },
  {
    path: '/markdown',
    name: 'Markdown 预览',
    shortName: 'MD',
    description: 'Markdown 实时预览与目录提取',
    category: '文本处理',
    icon: 'file-text',
  },
  {
    path: '/cron',
    name: 'Cron 解析 / 编辑',
    shortName: 'Cron',
    description: '可视化编辑、中文解析与下次触发',
    category: '日期时间',
    icon: 'timer',
  },
  {
    path: '/qrcode',
    name: '二维码',
    shortName: '二维码',
    description: '二维码本地生成与图片识别',
    category: '编码解码',
    icon: 'qr-code',
  },
  {
    path: '/image',
    name: '图片压缩',
    shortName: '压图',
    description: 'Canvas 改尺寸、压缩与格式导出',
    category: '设计开发',
    icon: 'image-down',
  },
  {
    path: '/favicon',
    name: 'Favicon 多尺寸',
    shortName: 'Favicon',
    description: '导出 favicon / PWA 多尺寸 PNG',
    category: '设计开发',
    icon: 'app-window',
  },
  {
    path: '/image-crop',
    name: '图片裁剪 / 圆角',
    shortName: '裁剪',
    description: '拖拽裁剪、圆角与圆形蒙版导出',
    category: '设计开发',
    icon: 'crop',
  },
  {
    path: '/svg',
    name: 'SVG 优化',
    shortName: 'SVG',
    description: 'SVG 清理优化与预览导出',
    category: '设计开发',
    icon: 'shapes',
  },
  {
    path: '/css-box',
    name: '阴影圆角 CSS',
    shortName: 'CSS',
    description: 'box-shadow / border-radius 可视化生成',
    category: '设计开发',
    icon: 'square-round-corner',
  },
  {
    path: '/hash',
    name: '哈希计算',
    shortName: '哈希',
    description: 'MD5 / SHA-1/256/384/512 文本与文件',
    category: '安全工具',
    icon: 'hash',
  },
  {
    path: '/jwt',
    name: 'JWT 解析 / 验签',
    shortName: 'JWT',
    description: '解析 Header/Payload，本地 HS/RS 验签',
    category: '安全工具',
    icon: 'shield-check',
  },
  {
    path: '/mime',
    name: 'MIME 类型',
    shortName: 'MIME',
    description: '扩展名与 MIME Type 互查',
    category: '编码解码',
    icon: 'file-type',
  },
  {
    path: '/timezone',
    name: '时间 / 时区',
    shortName: '时区',
    description: '多时区对照与墙上时钟转换',
    category: '日期时间',
    icon: 'globe',
  },
  {
    path: '/crypto',
    name: '加解密',
    shortName: '加解密',
    description: 'AES 对称加密 / RSA 非对称加解密',
    category: '安全工具',
    icon: 'lock',
  },
  {
    path: '/password',
    name: '随机密码',
    shortName: '密码',
    description: '可配置长度与字符集的安全密码生成',
    category: '安全工具',
    icon: 'key-round',
  },
  {
    path: '/guid',
    name: 'GUID 生成',
    shortName: 'GUID',
    description: 'UUID / GUID 批量生成与格式切换',
    category: '安全工具',
    icon: 'scan',
  },
  {
    path: '/fingerprint',
    name: '浏览器指纹',
    shortName: '指纹',
    description: '本机环境信息与简易指纹哈希',
    category: '网络信息',
    icon: 'fingerprint',
  },
  {
    path: '/timestamp',
    name: '时间戳转换',
    shortName: '时间戳',
    description: 'Unix 时间戳与日期时间双向转换',
    category: '日期时间',
    icon: 'clock',
  },
  {
    path: '/ip',
    name: '本机 / IP 查询',
    shortName: 'IP',
    description: '浏览器环境信息与公网 IP 查询',
    category: '网络信息',
    icon: 'wifi',
  },
  {
    path: '/ports',
    name: '端口 / 服务速查',
    shortName: '端口',
    description: '常见 TCP/UDP 端口与服务对照',
    category: '网络信息',
    icon: 'network',
  },
]

/** 分类名 → 锚点 id（稳定、URL 友好） */
const CATEGORY_ID_MAP: Record<string, string> = {
  数据格式: 'data',
  编码解码: 'codec',
  设计开发: 'design',
  文本处理: 'text',
  安全工具: 'security',
  网络信息: 'network',
  日期时间: 'datetime',
}

/**
 * 将分类名转为锚点 id，如「数据格式」→ cat-data
 */
export function categoryToId(category: string): string {
  const slug = CATEGORY_ID_MAP[category] ?? category
  return `cat-${slug}`
}

/** 按 tools 出现顺序得到去重后的分类列表 */
export function getToolCategories(list: ToolItem[] = tools): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const tool of list) {
    if (!seen.has(tool.category)) {
      seen.add(tool.category)
      result.push(tool.category)
    }
  }
  return result
}

/** 按分类分组（保持首次出现顺序） */
export function groupToolsByCategory(list: ToolItem[] = tools) {
  const map = new Map<string, ToolItem[]>()
  for (const tool of list) {
    const group = map.get(tool.category) ?? []
    group.push(tool)
    map.set(tool.category, group)
  }
  return map
}
