import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { AppContent } from './apps/AppContent'
import { AppIcon } from './components/AppIcon'
import { appById, dockAppIds, homeAppIds } from './system/apps'
import { defaultSettings, loadOrder, loadSettings, resetLuxStorage, saveOrder, saveSettings } from './system/storage'
import type { AppId, LuxSettings } from './system/types'

type Stage = 'boot' | 'lock' | 'home'

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatDate(date: Date) {
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function App() {
  const [stage, setStage] = useState<Stage>('boot')
  const [now, setNow] = useState(new Date())
  const [settings, setSettings] = useState<LuxSettings>(() => loadSettings())
  const [order, setOrder] = useState<AppId[]>(() => loadOrder(homeAppIds))
  const [editMode, setEditMode] = useState(false)
  const [controlOpen, setControlOpen] = useState(false)
  const [activeApp, setActiveApp] = useState<AppId | null>(null)
  const [closing, setClosing] = useState(false)
  const [origin, setOrigin] = useState({ x: 50, y: 50 })
  const dragging = useRef<AppId | null>(null)
  const suppressClickUntil = useRef(0)

  useEffect(() => {
    const boot = window.setTimeout(() => setStage('lock'), settings.reduceMotion ? 450 : 1800)
    return () => window.clearTimeout(boot)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => saveOrder(order), [order])

  const accentStyle = useMemo(() => ({
    '--glass-strength': `${settings.glassIntensity / 100}`,
  } as React.CSSProperties), [settings.glassIntensity])

  const openApp = (id: AppId, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (Date.now() < suppressClickUntil.current || editMode) return
    const rect = event.currentTarget.getBoundingClientRect()
    setOrigin({
      x: ((rect.left + rect.width / 2) / window.innerWidth) * 100,
      y: ((rect.top + rect.height / 2) / window.innerHeight) * 100,
    })
    setControlOpen(false)
    setClosing(false)
    setActiveApp(id)
  }

  const closeApp = () => {
    setClosing(true)
    window.setTimeout(() => {
      setActiveApp(null)
      setClosing(false)
    }, settings.reduceMotion ? 80 : 360)
  }

  const startEditDrag = (id: AppId, event: ReactPointerEvent<HTMLButtonElement>) => {
    dragging.current = id
    suppressClickUntil.current = Date.now() + 400
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  useEffect(() => {
    if (!editMode) dragging.current = null

    const move = (event: PointerEvent) => {
      if (!dragging.current) return
      const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-app-id]')
      const target = hit?.dataset.appId as AppId | undefined
      const source = dragging.current
      if (!target || source === target || !order.includes(target)) return

      setOrder(current => {
        const next = [...current]
        const from = next.indexOf(source)
        const to = next.indexOf(target)
        if (from < 0 || to < 0) return current
        next.splice(from, 1)
        next.splice(to, 0, source)
        return next
      })
    }

    const up = () => {
      if (dragging.current) suppressClickUntil.current = Date.now() + 250
      dragging.current = null
    }

    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [editMode, order])

  const reset = () => {
    resetLuxStorage()
    setSettings(defaultSettings)
    setOrder(homeAppIds)
  }

  return (
    <main
      className={`luxos accent-${settings.accent} ${settings.reduceMotion ? 'reduce-motion' : ''}`}
      style={accentStyle}
    >
      <div className="wallpaper" aria-hidden="true">
        <span className="aurora aurora-a" />
        <span className="aurora aurora-b" />
        <span className="aurora aurora-c" />
        <span className="grain" />
      </div>

      {stage === 'boot' && (
        <section className="boot-screen">
          <div className="boot-logo"><span>L</span></div>
          <strong>LuxOS</strong>
          <small>Designed by Lux</small>
          <div className="boot-progress"><span /></div>
        </section>
      )}

      {stage === 'lock' && (
        <section className="lock-screen" onPointerUp={() => setStage('home')}>
          <div className="status-row lock-status"><span>{formatTime(now)}</span><StatusIcons /></div>
          <div className="lock-center">
            <small>{formatDate(now)}</small>
            <div className="lock-time">{formatTime(now)}</div>
            <div className="lock-widget glass-card">
              <span className="lock-orb" />
              <div><strong>LuxOS</strong><small>Ready when you are.</small></div>
            </div>
          </div>
          <div className="unlock-hint"><span>↑</span><small>Swipe up or click to unlock</small></div>
        </section>
      )}

      {stage === 'home' && (
        <section className="home-screen" onPointerDown={event => {
          if (event.target === event.currentTarget && editMode) setEditMode(false)
        }}>
          <div className="status-row">
            <button className="status-time" onClick={() => setEditMode(false)}>{formatTime(now)}</button>
            <button className="status-controls" onClick={() => setControlOpen(value => !value)} aria-label="Open Control Center"><StatusIcons /></button>
          </div>

          <header className="home-header">
            <div>
              <small>{formatDate(now)}</small>
              <h1>LuxOS</h1>
            </div>
            {editMode && <button className="done-button glass-control" onClick={() => setEditMode(false)}>Done</button>}
          </header>

          <div className="home-widget glass-card">
            <div>
              <span className="eyebrow">LUX SYSTEM</span>
              <strong>Good evening.</strong>
              <small>Everything is where you left it.</small>
            </div>
            <span className="widget-orb"><i /></span>
          </div>

          <div className={`app-grid ${editMode ? 'editing-grid' : ''}`}>
            {order.map(id => (
              <AppIcon
                key={id}
                app={appById[id]}
                editMode={editMode}
                showLabel={settings.showLabels}
                onOpen={event => openApp(id, event)}
                onLongPress={() => setEditMode(true)}
                onPointerDownEdit={event => startEditDrag(id, event)}
              />
            ))}
          </div>

          <div className="page-dots" aria-label="Home page 1 of 1"><span className="active" /></div>

          <div className="dock glass-card">
            {dockAppIds.map(id => (
              <AppIcon
                key={id}
                app={appById[id]}
                showLabel={false}
                onOpen={event => openApp(id, event)}
              />
            ))}
          </div>

          {controlOpen && (
            <div className="control-center glass-card">
              <div className="control-title"><div><small>Control Center</small><strong>LuxOS</strong></div><button onClick={() => setControlOpen(false)}>×</button></div>
              <div className="control-grid">
                <button className="control-tile active"><span>◉</span><div><strong>Online</strong><small>Network</small></div></button>
                <button className="control-tile"><span>☾</span><div><strong>Focus</strong><small>Off</small></div></button>
                <button className="control-tile"><span>⌁</span><div><strong>Motion</strong><small>{settings.reduceMotion ? 'Reduced' : 'Full'}</small></div></button>
                <button className="control-tile"><span>◇</span><div><strong>Glass</strong><small>{settings.glassIntensity}%</small></div></button>
              </div>
              <label className="brightness-control"><span>☀</span><input type="range" min="25" max="100" value={settings.glassIntensity} onChange={e => setSettings({ ...settings, glassIntensity: Number(e.target.value) })} /></label>
            </div>
          )}
        </section>
      )}

      {activeApp && (
        <section
          className={`app-layer ${closing ? 'closing' : 'opening'}`}
          style={{ '--origin-x': `${origin.x}%`, '--origin-y': `${origin.y}%` } as React.CSSProperties}
        >
          <div className="app-background" />
          <div className="app-status status-row"><span>{formatTime(now)}</span><StatusIcons /></div>
          <header className="app-toolbar">
            <button className="close-app glass-control" onClick={closeApp} aria-label="Close app"><span>‹</span></button>
            <div><small>{appById[activeApp].subtitle}</small><strong>{appById[activeApp].name}</strong></div>
            <span className={`mini-app-icon ${appById[activeApp].className}`}>{appById[activeApp].icon}</span>
          </header>
          <div className="app-scroll">
            <AppContent appId={activeApp} settings={settings} updateSettings={setSettings} onReset={reset} />
          </div>
          <button className="home-indicator" onClick={closeApp} aria-label="Close app" />
        </section>
      )}
    </main>
  )
}

function StatusIcons() {
  return <span className="status-icons" aria-hidden="true"><i className="signal" /><i className="wifi">⌁</i><i className="battery"><b /></i></span>
}
