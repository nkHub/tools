import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    // 构建产物可挂载到子路径（如 AKM 插件的 /tools）：base 用环境变量控制，
    // 打包插件时传 VITE_BASE='./' 用相对路径加载资源，本地 dev / 常规部署
    // 保持使用 VITE_BASE_PATH（与 App.tsx 中 BrowserRouter 的 basename 一致）。
    base: process.env.VITE_BASE || env.VITE_BASE_PATH,
    plugins: [react()],
  }
})
