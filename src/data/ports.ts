/**
 * 常见 TCP/UDP 端口与服务速查（精选静态表，离线使用）
 */

export interface PortEntry {
  /** 端口号 */
  port: number
  /** 传输层（多数为 tcp，部分两者） */
  proto: 'tcp' | 'udp' | 'tcp/udp'
  /** 服务名 */
  service: string
  /** 简要说明 */
  desc: string
  /** 分类标签 */
  tags?: string[]
}

/** 精选常用端口（非完整 IANA 表） */
export const PORTS: PortEntry[] = [
  { port: 20, proto: 'tcp', service: 'FTP-DATA', desc: 'FTP 数据通道', tags: ['文件', 'ftp'] },
  { port: 21, proto: 'tcp', service: 'FTP', desc: '文件传输协议控制', tags: ['文件', 'ftp'] },
  { port: 22, proto: 'tcp', service: 'SSH', desc: '安全远程登录 / SFTP', tags: ['远程', '安全'] },
  { port: 23, proto: 'tcp', service: 'Telnet', desc: '明文远程终端（不推荐）', tags: ['远程'] },
  { port: 25, proto: 'tcp', service: 'SMTP', desc: '邮件发送', tags: ['邮件'] },
  { port: 53, proto: 'tcp/udp', service: 'DNS', desc: '域名解析', tags: ['网络'] },
  { port: 67, proto: 'udp', service: 'DHCP Server', desc: '动态主机配置（服务端）', tags: ['网络'] },
  { port: 68, proto: 'udp', service: 'DHCP Client', desc: '动态主机配置（客户端）', tags: ['网络'] },
  { port: 69, proto: 'udp', service: 'TFTP', desc: '简单文件传输', tags: ['文件'] },
  { port: 80, proto: 'tcp', service: 'HTTP', desc: '万维网', tags: ['web'] },
  { port: 110, proto: 'tcp', service: 'POP3', desc: '邮件收取', tags: ['邮件'] },
  { port: 123, proto: 'udp', service: 'NTP', desc: '网络时间同步', tags: ['时间'] },
  { port: 143, proto: 'tcp', service: 'IMAP', desc: '邮件访问', tags: ['邮件'] },
  { port: 161, proto: 'udp', service: 'SNMP', desc: '网络设备管理', tags: ['运维'] },
  { port: 162, proto: 'udp', service: 'SNMP Trap', desc: 'SNMP 陷阱通知', tags: ['运维'] },
  { port: 179, proto: 'tcp', service: 'BGP', desc: '边界网关协议', tags: ['网络'] },
  { port: 389, proto: 'tcp/udp', service: 'LDAP', desc: '目录服务', tags: ['认证'] },
  { port: 443, proto: 'tcp', service: 'HTTPS', desc: 'HTTP over TLS', tags: ['web', '安全'] },
  { port: 445, proto: 'tcp', service: 'SMB', desc: 'Windows 文件共享', tags: ['文件', 'windows'] },
  { port: 465, proto: 'tcp', service: 'SMTPS', desc: 'SMTP over TLS（常见）', tags: ['邮件', '安全'] },
  { port: 514, proto: 'udp', service: 'Syslog', desc: '系统日志', tags: ['运维'] },
  { port: 587, proto: 'tcp', service: 'Submission', desc: '邮件提交（MSA）', tags: ['邮件'] },
  { port: 631, proto: 'tcp/udp', service: 'IPP', desc: '互联网打印协议 / CUPS', tags: ['打印'] },
  { port: 636, proto: 'tcp', service: 'LDAPS', desc: 'LDAP over TLS', tags: ['认证', '安全'] },
  { port: 993, proto: 'tcp', service: 'IMAPS', desc: 'IMAP over TLS', tags: ['邮件', '安全'] },
  { port: 995, proto: 'tcp', service: 'POP3S', desc: 'POP3 over TLS', tags: ['邮件', '安全'] },
  { port: 1080, proto: 'tcp', service: 'SOCKS', desc: 'SOCKS 代理', tags: ['代理'] },
  { port: 1194, proto: 'tcp/udp', service: 'OpenVPN', desc: 'OpenVPN 默认端口', tags: ['vpn'] },
  { port: 1433, proto: 'tcp', service: 'MSSQL', desc: 'Microsoft SQL Server', tags: ['数据库'] },
  { port: 1521, proto: 'tcp', service: 'Oracle', desc: 'Oracle 数据库监听', tags: ['数据库'] },
  { port: 1723, proto: 'tcp', service: 'PPTP', desc: '点对点隧道（过时）', tags: ['vpn'] },
  { port: 1883, proto: 'tcp', service: 'MQTT', desc: '物联网消息队列', tags: ['iot'] },
  { port: 2049, proto: 'tcp/udp', service: 'NFS', desc: '网络文件系统', tags: ['文件'] },
  { port: 2181, proto: 'tcp', service: 'ZooKeeper', desc: '分布式协调', tags: ['中间件'] },
  { port: 2375, proto: 'tcp', service: 'Docker API', desc: 'Docker 远程 API（无 TLS）', tags: ['容器'] },
  { port: 2376, proto: 'tcp', service: 'Docker API TLS', desc: 'Docker 远程 API（TLS）', tags: ['容器', '安全'] },
  { port: 2379, proto: 'tcp', service: 'etcd', desc: 'etcd 客户端', tags: ['k8s', '中间件'] },
  { port: 2380, proto: 'tcp', service: 'etcd peer', desc: 'etcd 集群对等', tags: ['k8s'] },
  { port: 3000, proto: 'tcp', service: 'Dev HTTP', desc: '常见开发服务（Grafana/Node 等）', tags: ['web', 'dev'] },
  { port: 3306, proto: 'tcp', service: 'MySQL', desc: 'MySQL / MariaDB', tags: ['数据库'] },
  { port: 3389, proto: 'tcp', service: 'RDP', desc: '远程桌面', tags: ['远程', 'windows'] },
  { port: 3478, proto: 'tcp/udp', service: 'STUN/TURN', desc: 'WebRTC NAT 穿透', tags: ['webrtc'] },
  { port: 4222, proto: 'tcp', service: 'NATS', desc: 'NATS 消息系统', tags: ['中间件'] },
  { port: 4369, proto: 'tcp', service: 'EPMD', desc: 'Erlang 端口映射', tags: ['中间件'] },
  { port: 5000, proto: 'tcp', service: 'Dev HTTP', desc: '常见开发服务 / Flask', tags: ['web', 'dev'] },
  { port: 5173, proto: 'tcp', service: 'Vite', desc: 'Vite 开发服务器默认', tags: ['web', 'dev'] },
  { port: 5432, proto: 'tcp', service: 'PostgreSQL', desc: 'PostgreSQL 数据库', tags: ['数据库'] },
  { port: 5601, proto: 'tcp', service: 'Kibana', desc: 'Elastic Kibana', tags: ['运维'] },
  { port: 5672, proto: 'tcp', service: 'AMQP', desc: 'RabbitMQ 等消息队列', tags: ['中间件'] },
  { port: 5900, proto: 'tcp', service: 'VNC', desc: '远程图形桌面', tags: ['远程'] },
  { port: 6379, proto: 'tcp', service: 'Redis', desc: 'Redis 缓存/数据库', tags: ['数据库', '缓存'] },
  { port: 6443, proto: 'tcp', service: 'Kubernetes API', desc: 'K8s API Server', tags: ['k8s'] },
  { port: 8000, proto: 'tcp', service: 'Dev HTTP', desc: '常见开发 HTTP', tags: ['web', 'dev'] },
  { port: 8080, proto: 'tcp', service: 'HTTP-Alt', desc: '备用 HTTP / 代理 / 应用', tags: ['web'] },
  { port: 8443, proto: 'tcp', service: 'HTTPS-Alt', desc: '备用 HTTPS', tags: ['web', '安全'] },
  { port: 8888, proto: 'tcp', service: 'Dev HTTP', desc: 'Jupyter / 代理等', tags: ['dev'] },
  { port: 9000, proto: 'tcp', service: 'MinIO / Sonar', desc: '对象存储或分析工具常见端口', tags: ['存储', 'dev'] },
  { port: 9090, proto: 'tcp', service: 'Prometheus', desc: 'Prometheus 指标', tags: ['运维'] },
  { port: 9092, proto: 'tcp', service: 'Kafka', desc: 'Apache Kafka', tags: ['中间件'] },
  { port: 9200, proto: 'tcp', service: 'Elasticsearch', desc: 'Elasticsearch HTTP', tags: ['搜索', '运维'] },
  { port: 9300, proto: 'tcp', service: 'ES Transport', desc: 'Elasticsearch 节点通信', tags: ['搜索'] },
  { port: 9418, proto: 'tcp', service: 'Git', desc: 'Git 协议', tags: ['vcs'] },
  { port: 11211, proto: 'tcp/udp', service: 'Memcached', desc: '内存缓存', tags: ['缓存'] },
  { port: 27017, proto: 'tcp', service: 'MongoDB', desc: 'MongoDB 数据库', tags: ['数据库'] },
  { port: 50000, proto: 'tcp', service: 'SAP / 动态', desc: '部分企业应用；亦属动态端口区', tags: ['企业'] },
]

/**
 * 搜索端口表：支持端口号、服务名、描述、标签
 */
export function searchPorts(query: string, limit = 80): PortEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return PORTS.slice(0, limit)

  const portNum = Number(q)
  const isPort = /^\d{1,5}$/.test(q) && Number.isFinite(portNum)

  const scored = PORTS.map((entry) => {
    let score = 0
    if (isPort && entry.port === portNum) score += 100
    else if (isPort && String(entry.port).startsWith(q)) score += 40
    else if (String(entry.port).includes(q)) score += 20

    const service = entry.service.toLowerCase()
    const desc = entry.desc.toLowerCase()
    if (service === q) score += 80
    else if (service.startsWith(q)) score += 50
    else if (service.includes(q)) score += 30
    if (desc.includes(q)) score += 15
    if (entry.tags?.some((t) => t.toLowerCase().includes(q))) score += 25
    if (entry.proto.includes(q)) score += 10

    return { entry, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.port - b.entry.port)

  return scored.slice(0, limit).map((x) => x.entry)
}
