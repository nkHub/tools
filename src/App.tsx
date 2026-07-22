import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { JsonTool } from './pages/JsonTool'
import { YamlTool } from './pages/YamlTool'
import { Base64Tool } from './pages/Base64Tool'
import { Base64ImageTool } from './pages/Base64ImageTool'
import { Base64HexTool } from './pages/Base64HexTool'
import { UrlTool } from './pages/UrlTool'
import { RadixTool } from './pages/RadixTool'
import { ColorTool } from './pages/ColorTool'
import { PaletteTool } from './pages/PaletteTool'
import { ImageColorTool } from './pages/ImageColorTool'
import { GradientTool } from './pages/GradientTool'
import { RegexTool } from './pages/RegexTool'
import { UnicodeTool } from './pages/UnicodeTool'
import { MarkdownTool } from './pages/MarkdownTool'
import { CronTool } from './pages/CronTool'
import { QrcodeTool } from './pages/QrcodeTool'
import { ImageTool } from './pages/ImageTool'
import { FaviconTool } from './pages/FaviconTool'
import { ImageCropTool } from './pages/ImageCropTool'
import { SvgTool } from './pages/SvgTool'
import { CssBoxTool } from './pages/CssBoxTool'
import { CryptoTool } from './pages/CryptoTool'
import { HashTool } from './pages/HashTool'
import { JwtTool } from './pages/JwtTool'
import { MimeTool } from './pages/MimeTool'
import { TimezoneTool } from './pages/TimezoneTool'
import { PasswordTool } from './pages/PasswordTool'
import { GuidTool } from './pages/GuidTool'
import { FingerprintTool } from './pages/FingerprintTool'
import { TimestampTool } from './pages/TimestampTool'
import { IpTool } from './pages/IpTool'
import { PortTool } from './pages/PortTool'

/**
 * 应用路由入口
 * 所有页面嵌套在 Layout 中，统一导航与页脚
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="json" element={<JsonTool />} />
          <Route path="yaml" element={<YamlTool />} />
          <Route path="base64" element={<Base64Tool />} />
          <Route path="base64-image" element={<Base64ImageTool />} />
          <Route path="base64-hex" element={<Base64HexTool />} />
          <Route path="url" element={<UrlTool />} />
          <Route path="radix" element={<RadixTool />} />
          <Route path="color" element={<ColorTool />} />
          <Route path="palette" element={<PaletteTool />} />
          <Route path="image-color" element={<ImageColorTool />} />
          <Route path="gradient" element={<GradientTool />} />
          <Route path="regex" element={<RegexTool />} />
          <Route path="unicode" element={<UnicodeTool />} />
          <Route path="markdown" element={<MarkdownTool />} />
          <Route path="cron" element={<CronTool />} />
          <Route path="qrcode" element={<QrcodeTool />} />
          <Route path="image" element={<ImageTool />} />
          <Route path="favicon" element={<FaviconTool />} />
          <Route path="image-crop" element={<ImageCropTool />} />
          <Route path="svg" element={<SvgTool />} />
          <Route path="css-box" element={<CssBoxTool />} />
          <Route path="hash" element={<HashTool />} />
          <Route path="jwt" element={<JwtTool />} />
          <Route path="mime" element={<MimeTool />} />
          <Route path="timezone" element={<TimezoneTool />} />
          <Route path="crypto" element={<CryptoTool />} />
          <Route path="password" element={<PasswordTool />} />
          <Route path="guid" element={<GuidTool />} />
          <Route path="fingerprint" element={<FingerprintTool />} />
          <Route path="timestamp" element={<TimestampTool />} />
          <Route path="ip" element={<IpTool />} />
          <Route path="ports" element={<PortTool />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
