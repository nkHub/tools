import { useMemo, useState } from 'react'
import { ToolPage } from '../components/ToolPage'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import './CssBoxTool.css'

/**
 * box-shadow / border-radius 可视化生成
 */
export function CssBoxTool() {
  // 圆角
  const [linkedRadius, setLinkedRadius] = useState(true)
  const [rTL, setRTL] = useState(16)
  const [rTR, setRTR] = useState(16)
  const [rBR, setRBR] = useState(16)
  const [rBL, setRBL] = useState(16)

  // 阴影
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(8)
  const [blur, setBlur] = useState(24)
  const [spread, setSpread] = useState(0)
  const [shadowColor, setShadowColor] = useState('#000000')
  const [shadowAlpha, setShadowAlpha] = useState(0.35)
  const [inset, setInset] = useState(false)

  // 预览盒
  const [boxColor, setBoxColor] = useState('#38bdf8')
  const [boxW, setBoxW] = useState(180)
  const [boxH, setBoxH] = useState(120)

  const { copy } = useCopyFeedback()

  function setAllRadius(v: number) {
    setRTL(v)
    setRTR(v)
    setRBR(v)
    setRBL(v)
  }

  const borderRadius = useMemo(() => {
    if (linkedRadius || (rTL === rTR && rTR === rBR && rBR === rBL)) {
      return `${rTL}px`
    }
    return `${rTL}px ${rTR}px ${rBR}px ${rBL}px`
  }, [linkedRadius, rTL, rTR, rBR, rBL])

  const shadowRgba = useMemo(() => {
    const hex = shadowColor.replace('#', '')
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
    const r = parseInt(full.slice(0, 2), 16) || 0
    const g = parseInt(full.slice(2, 4), 16) || 0
    const b = parseInt(full.slice(4, 6), 16) || 0
    return `rgba(${r}, ${g}, ${b}, ${shadowAlpha})`
  }, [shadowColor, shadowAlpha])

  const boxShadow = useMemo(() => {
    const core = `${offsetX}px ${offsetY}px ${blur}px ${spread}px ${shadowRgba}`
    return inset ? `inset ${core}` : core
  }, [offsetX, offsetY, blur, spread, shadowRgba, inset])

  const cssText = useMemo(
    () =>
      [
        `border-radius: ${borderRadius};`,
        `box-shadow: ${boxShadow};`,
      ].join('\n'),
    [borderRadius, boxShadow],
  )

  return (
    <ToolPage
      title="阴影圆角 CSS"
      description="可视化调节 border-radius 与 box-shadow，一键复制 CSS。纯本地。"
      badge="离线"
    >
      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>圆角 border-radius</h2>
            <label className="toolbar" style={{ gap: '0.35rem' }}>
              <input
                type="checkbox"
                checked={linkedRadius}
                onChange={(e) => {
                  setLinkedRadius(e.target.checked)
                  if (e.target.checked) setAllRadius(rTL)
                }}
              />
              <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>四角相同</span>
            </label>
          </div>
          {linkedRadius ? (
            <div className="field">
              <label htmlFor="r-all">圆角 {rTL}px</label>
              <input
                id="r-all"
                type="range"
                min={0}
                max={80}
                value={rTL}
                onChange={(e) => setAllRadius(Number(e.target.value))}
              />
            </div>
          ) : (
            <div className="grid-2">
              {(
                [
                  ['左上', rTL, setRTL],
                  ['右上', rTR, setRTR],
                  ['右下', rBR, setRBR],
                  ['左下', rBL, setRBL],
                ] as const
              ).map(([label, val, set]) => (
                <div className="field" key={label}>
                  <label>
                    {label} {val}px
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={val}
                    onChange={(e) => set(Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="panel-head" style={{ marginTop: '1.25rem' }}>
            <h2>阴影 box-shadow</h2>
            <label className="toolbar" style={{ gap: '0.35rem' }}>
              <input type="checkbox" checked={inset} onChange={(e) => setInset(e.target.checked)} />
              <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>inset</span>
            </label>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>X 偏移 {offsetX}px</label>
              <input type="range" min={-40} max={40} value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Y 偏移 {offsetY}px</label>
              <input type="range" min={-40} max={40} value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>模糊 {blur}px</label>
              <input type="range" min={0} max={80} value={blur} onChange={(e) => setBlur(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>扩展 {spread}px</label>
              <input type="range" min={-20} max={40} value={spread} onChange={(e) => setSpread(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>阴影色</label>
              <input type="color" value={shadowColor} onChange={(e) => setShadowColor(e.target.value)} />
            </div>
            <div className="field">
              <label>不透明度 {shadowAlpha.toFixed(2)}</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={shadowAlpha}
                onChange={(e) => setShadowAlpha(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="panel-head" style={{ marginTop: '1.25rem' }}>
            <h2>预览盒</h2>
          </div>
          <div className="toolbar">
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>填充</span>
              <input type="color" value={boxColor} onChange={(e) => setBoxColor(e.target.value)} />
            </label>
            <div className="field" style={{ minWidth: 100 }}>
              <label>宽 {boxW}</label>
              <input type="range" min={80} max={320} value={boxW} onChange={(e) => setBoxW(Number(e.target.value))} />
            </div>
            <div className="field" style={{ minWidth: 100 }}>
              <label>高 {boxH}</label>
              <input type="range" min={60} max={240} value={boxH} onChange={(e) => setBoxH(Number(e.target.value))} />
            </div>
          </div>
        </div>

        <div className="panel css-box-preview-panel">
          <div className="panel-head">
            <h2>预览</h2>
          </div>
          <div className="css-box-stage">
            <div
              className="css-box-sample"
              style={{
                width: boxW,
                height: boxH,
                background: boxColor,
                borderRadius,
                boxShadow,
              }}
            />
          </div>
          <div className="panel-head">
            <h2>CSS</h2>
            <button type="button" className="btn btn-primary" onClick={() => void copy(cssText)}>
              复制
            </button>
          </div>
          <pre className="json-raw-view" style={{ minHeight: 100, maxHeight: 200 }}>
            {cssText}
          </pre>
        </div>
      </div>
    </ToolPage>
  )
}
