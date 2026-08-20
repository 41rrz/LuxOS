import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, Dispatch, PointerEvent as ReactPointerEvent, SetStateAction } from 'react'
import { AppContent } from './apps/AppContent'
import { appById, apps, desktopApps, pinnedApps } from './system/apps'
import {
  defaultSettings,
  loadDesktopPositions,
  loadSettings,
  loadPinnedOrder,
  loadWindowLayout,
  resetLuxStorage,
  saveDesktopPositions,
  saveSettings,
  savePinnedOrder,
  saveWindowLayout,
} from './system/storage'
import type { AppId, DesktopPosition, LuxSettings, SessionStage, WindowState } from './system/types'

const TASKBAR_HEIGHT = 48
const DESKTOP_ICON_WIDTH = 86
const DESKTOP_ICON_HEIGHT = 88
let windowSequence = 1
let notificationSequence = 1

type SnapMode = 'left' | 'right' | 'maximize' | null
type TrayPanel = 'network' | 'volume' | 'notifications' | null

type SelectionBox = {
  left: number
  top: number
  width: number
  height: number
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatDate(date: Date) {
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function defaultDesktopPosition(index: number): DesktopPosition {
  return { x: 18, y: 22 + index * 92 }
}

function playSystemSound(kind: 'login' | 'shutdown' | 'notify', settings: LuxSettings) {
  if (!settings.systemSounds || settings.masterVolume <= 0) return
  try {
    type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext }
    const AudioCtor = window.AudioContext || (window as AudioWindow).webkitAudioContext
    if (!AudioCtor) return
    const context = new AudioCtor()
    const master = context.createGain()
    master.gain.value = Math.max(0.001, settings.masterVolume / 100) * 0.085
    master.connect(context.destination)

    const sequence = kind === 'login'
      ? [[392, 0], [523.25, 0.11], [659.25, 0.23], [783.99, 0.36]]
      : kind === 'shutdown'
        ? [[659.25, 0], [523.25, 0.14], [392, 0.28]]
        : [[523.25, 0], [659.25, 0.1]]

    sequence.forEach(([frequency, offset]) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.001, context.currentTime + offset)
      gain.gain.exponentialRampToValueAtTime(0.9, context.currentTime + offset + 0.018)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + offset + 0.3)
      oscillator.connect(gain)
      gain.connect(master)
      oscillator.start(context.currentTime + offset)
      oscillator.stop(context.currentTime + offset + 0.32)
    })
    window.setTimeout(() => void context.close(), 1000)
  } catch {
    // Audio is optional and may be blocked by the browser until a user gesture.
  }
}

export default function App() {
  const [stage, setStage] = useState<SessionStage>('boot')
  const [now, setNow] = useState(new Date())
  const [settings, setSettings] = useState<LuxSettings>(loadSettings)
  const [windows, setWindows] = useState<WindowState[]>([])
  const [windowLayout, setWindowLayout] = useState(loadWindowLayout)
  const [desktopPositions, setDesktopPositions] = useState(loadDesktopPositions)
  const [startOpen, setStartOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedDesktop, setSelectedDesktop] = useState<AppId[]>([])
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [trayPanel, setTrayPanel] = useState<TrayPanel>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [powerOpen, setPowerOpen] = useState(false)
  const [loginPassword, setLoginPassword] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [snapPreview, setSnapPreview] = useState<SnapMode>(null)
  const [altTab, setAltTab] = useState({ open: false, index: 0 })
  const [pinnedOrder, setPinnedOrder] = useState<AppId[]>(() => loadPinnedOrder(pinnedApps.map(app => app.id)))
  const [recentApps, setRecentApps] = useState<AppId[]>([])
  const [peekDesktop, setPeekDesktop] = useState(false)
  const [notifications, setNotifications] = useState<Array<{ id: number; title: string; message: string; time: string }>>([
    { id: notificationSequence++, title: 'LuxOS 0.4', message: 'Virtual storage and the upgraded desktop shell are ready.', time: 'Now' },
  ])
  const zRef = useRef(10)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => savePinnedOrder(pinnedOrder), [pinnedOrder])

  useEffect(() => {
    const timer = window.setTimeout(() => saveDesktopPositions(desktopPositions), 140)
    return () => window.clearTimeout(timer)
  }, [desktopPositions])

  useEffect(() => {
    if (windows.length === 0) return
    const timer = window.setTimeout(() => {
      setWindowLayout(current => {
        const next = { ...current }
        windows.forEach(item => {
          const geometry = item.maximized && item.restore ? item.restore : item
          next[item.appId] = {
            x: geometry.x,
            y: geometry.y,
            width: geometry.width,
            height: geometry.height,
            maximized: item.maximized,
          }
        })
        saveWindowLayout(next)
        return next
      })
    }, 180)
    return () => window.clearTimeout(timer)
  }, [windows])

  useEffect(() => {
    if (stage !== 'boot') return
    const timer = window.setTimeout(() => setStage('login'), settings.reduceMotion ? 300 : 1650)
    return () => window.clearTimeout(timer)
  }, [stage, settings.reduceMotion])

  const sortedWindows = useMemo(() => [...windows].sort((a, b) => b.z - a.z), [windows])

  useEffect(() => {
    if (stage !== 'desktop') return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && event.altKey && sortedWindows.length > 0) {
        event.preventDefault()
        setStartOpen(false)
        setCalendarOpen(false)
        setTrayPanel(null)
        setAltTab(current => ({ open: true, index: current.open ? (current.index + 1) % sortedWindows.length : 0 }))
      }
      if (event.key === 'Escape') {
        setStartOpen(false)
        setCalendarOpen(false)
        setTrayPanel(null)
        setContextMenu(null)
        setAltTab({ open: false, index: 0 })
      }
      if (event.key === 'Escape' && selectionBox) setSelectionBox(null)
      if (event.ctrlKey && event.key === 'Escape') {
        event.preventDefault()
        setStartOpen(current => !current)
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== 'Alt') return
      setAltTab(current => {
        if (!current.open || sortedWindows.length === 0) return current
        const target = sortedWindows[current.index % sortedWindows.length]
        if (target) {
          const z = ++zRef.current
          setWindows(items => items.map(item => item.id === target.id ? { ...item, z, minimized: false } : item))
        }
        return { open: false, index: 0 }
      })
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [selectionBox, sortedWindows, stage])

  useEffect(() => {
    const closeMenus = () => setContextMenu(null)
    window.addEventListener('pointerdown', closeMenus)
    return () => window.removeEventListener('pointerdown', closeMenus)
  }, [])

  const accentStyle = useMemo(() => ({ '--glass-strength': `${settings.glassIntensity / 100}` } as CSSProperties), [settings.glassIntensity])

  const pushNotification = (message: string, title = 'LuxOS') => {
    setNotifications(current => [{ id: notificationSequence++, title, message, time: formatTime(new Date()) }, ...current].slice(0, 12))
  }

  const clearWindowMotion = (id: number) => {
    window.setTimeout(() => setWindows(current => current.map(item => item.id === id ? { ...item, motion: undefined } : item)), settings.reduceMotion ? 0 : 210)
  }

  const focusWindow = (id: number) => {
    const z = ++zRef.current
    setWindows(current => current.map(item => item.id === id ? { ...item, z, minimized: false, motion: item.minimized ? 'restoring' : item.motion } : item))
    clearWindowMotion(id)
  }

  const openApp = (appId: AppId) => {
    setRecentApps(current => [appId, ...current.filter(id => id !== appId)].slice(0, 5))
    setStartOpen(false)
    setContextMenu(null)
    setCalendarOpen(false)
    setTrayPanel(null)
    const existing = windows.find(item => item.appId === appId)
    if (existing) {
      focusWindow(existing.id)
      return
    }

    const app = appById[appId]
    const saved = windowLayout[appId]
    const maxWidth = Math.max(320, window.innerWidth - 40)
    const maxHeight = Math.max(260, window.innerHeight - TASKBAR_HEIGHT - 40)
    const width = clamp(saved?.width ?? app.width, 420, maxWidth)
    const height = clamp(saved?.height ?? app.height, 300, maxHeight)
    const cascade = (windows.length % 6) * 26
    const defaultX = (window.innerWidth - width) / 2 + cascade - 55
    const defaultY = (window.innerHeight - TASKBAR_HEIGHT - height) / 2 + cascade - 30
    const x = clamp(saved?.x ?? defaultX, 8, Math.max(8, window.innerWidth - width - 8))
    const y = clamp(saved?.y ?? defaultY, 8, Math.max(8, window.innerHeight - TASKBAR_HEIGHT - height - 8))
    const z = ++zRef.current
    setWindows(current => [...current, {
      id: windowSequence++,
      appId,
      x,
      y,
      width,
      height,
      z,
      minimized: false,
      maximized: Boolean(saved?.maximized),
      motion: 'opening',
      restore: saved?.maximized ? { x, y, width, height } : undefined,
    }])
    clearWindowMotion(windowSequence - 1)
  }

  const closeWindow = (id: number) => {
    if (settings.reduceMotion) { setWindows(current => current.filter(item => item.id !== id)); return }
    setWindows(current => current.map(item => item.id === id ? { ...item, motion: 'closing' } : item))
    window.setTimeout(() => setWindows(current => current.filter(item => item.id !== id)), 170)
  }
  const minimizeWindow = (id: number) => {
    if (settings.reduceMotion) { setWindows(current => current.map(item => item.id === id ? { ...item, minimized: true } : item)); return }
    setWindows(current => current.map(item => item.id === id ? { ...item, motion: 'minimizing' } : item))
    window.setTimeout(() => setWindows(current => current.map(item => item.id === id ? { ...item, minimized: true, motion: undefined } : item)), 170)
  }

  const toggleMaximize = (id: number) => {
    setWindows(current => current.map(item => {
      if (item.id !== id) return item
      if (item.maximized && item.restore) return { ...item, ...item.restore, maximized: false, restore: undefined }
      return { ...item, maximized: true, restore: { x: item.x, y: item.y, width: item.width, height: item.height } }
    }))
    focusWindow(id)
  }

  const applySnap = (id: number, mode: Exclude<SnapMode, null>) => {
    const availableHeight = window.innerHeight - TASKBAR_HEIGHT
    const halfWidth = Math.floor(window.innerWidth / 2)
    setWindows(current => current.map(item => {
      if (item.id !== id) return item
      const restore = item.restore ?? { x: item.x, y: item.y, width: item.width, height: item.height }
      if (mode === 'maximize') return { ...item, maximized: true, restore }
      if (mode === 'left') return { ...item, x: 0, y: 0, width: halfWidth, height: availableHeight, maximized: false, restore }
      return { ...item, x: halfWidth, y: 0, width: window.innerWidth - halfWidth, height: availableHeight, maximized: false, restore }
    }))
    focusWindow(id)
  }

  const beginDrag = (event: ReactPointerEvent, item: WindowState) => {
    if (item.maximized || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    focusWindow(item.id)
    const startX = event.clientX
    const startY = event.clientY
    const startLeft = item.x
    const startTop = item.y
    let pendingSnap: SnapMode = null

    const onMove = (move: PointerEvent) => {
      const x = clamp(startLeft + move.clientX - startX, -item.width + 120, window.innerWidth - 120)
      const y = clamp(startTop + move.clientY - startY, 0, window.innerHeight - TASKBAR_HEIGHT - 34)
      setWindows(current => current.map(win => win.id === item.id ? { ...win, x, y } : win))

      if (move.clientY <= 10) pendingSnap = 'maximize'
      else if (move.clientX <= 12) pendingSnap = 'left'
      else if (move.clientX >= window.innerWidth - 12) pendingSnap = 'right'
      else pendingSnap = null
      setSnapPreview(pendingSnap)
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setSnapPreview(null)
      if (pendingSnap) applySnap(item.id, pendingSnap)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const beginResize = (event: ReactPointerEvent, item: WindowState) => {
    if (item.maximized || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    focusWindow(item.id)
    const startX = event.clientX
    const startY = event.clientY
    const startWidth = item.width
    const startHeight = item.height
    const onMove = (move: PointerEvent) => {
      const width = clamp(startWidth + move.clientX - startX, 420, Math.max(420, window.innerWidth - item.x))
      const height = clamp(startHeight + move.clientY - startY, 300, Math.max(300, window.innerHeight - TASKBAR_HEIGHT - item.y))
      setWindows(current => current.map(win => win.id === item.id ? { ...win, width, height, restore: undefined } : win))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const beginDesktopIconDrag = (event: ReactPointerEvent, appId: AppId, index: number) => {
    if (event.button !== 0) return
    event.stopPropagation()
    const start = desktopPositions[appId] ?? defaultDesktopPosition(index)
    const pointerStartX = event.clientX
    const pointerStartY = event.clientY
    let moved = false

    const onMove = (move: PointerEvent) => {
      const dx = move.clientX - pointerStartX
      const dy = move.clientY - pointerStartY
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true
      if (!moved) return
      const maxX = Math.max(4, window.innerWidth - DESKTOP_ICON_WIDTH - 4)
      const maxY = Math.max(4, window.innerHeight - TASKBAR_HEIGHT - DESKTOP_ICON_HEIGHT - 4)
      setDesktopPositions(current => ({
        ...current,
        [appId]: { x: clamp(start.x + dx, 4, maxX), y: clamp(start.y + dy, 4, maxY) },
      }))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const beginDesktopSelection = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    setStartOpen(false)
    setCalendarOpen(false)
    setTrayPanel(null)
    setPowerOpen(false)
    setContextMenu(null)
    setSelectedDesktop([])
    const startX = event.clientX
    const startY = event.clientY

    const onMove = (move: PointerEvent) => {
      const left = Math.min(startX, move.clientX)
      const top = Math.min(startY, move.clientY)
      const width = Math.abs(move.clientX - startX)
      const height = Math.abs(move.clientY - startY)
      setSelectionBox({ left, top, width, height })
      const right = left + width
      const bottom = top + height
      const selected = desktopApps.filter((app, index) => {
        const position = desktopPositions[app.id] ?? defaultDesktopPosition(index)
        return position.x < right && position.x + DESKTOP_ICON_WIDTH > left && position.y < bottom && position.y + DESKTOP_ICON_HEIGHT > top
      }).map(app => app.id)
      setSelectedDesktop(selected)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setSelectionBox(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const login = () => {
    playSystemSound('login', settings)
    setStage('welcome')
    setLoginPassword('')
    window.setTimeout(() => {
      setStage('desktop')
      setToast('Welcome to LuxOS Desktop 0.4')
      pushNotification('Your desktop session is ready. Aero Peek, custom wallpaper and virtual storage are available.')
      window.setTimeout(() => setToast(null), 3200)
    }, settings.reduceMotion ? 250 : 1350)
  }

  const signOut = () => {
    setWindows([])
    setStartOpen(false)
    setPowerOpen(false)
    setStage('login')
  }

  const restart = () => {
    playSystemSound('shutdown', settings)
    setPowerOpen(false)
    setWindows([])
    setStage('boot')
  }

  const shutdown = () => {
    playSystemSound('shutdown', settings)
    setPowerOpen(false)
    setStage('shutdown')
  }

  const reset = () => {
    resetLuxStorage()
    setSettings(defaultSettings)
    setDesktopPositions({})
    setWindowLayout({})
    setPinnedOrder(pinnedApps.map(app => app.id))
    setToast('LuxOS local settings were reset')
    pushNotification('Appearance, window and taskbar settings were reset. Your virtual files were kept.')
  }

  const filteredApps = apps.filter(app => `${app.name} ${app.subtitle}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <main className={`luxos desktop-os accent-${settings.accent} wallpaper-${settings.wallpaper} ${settings.reduceMotion ? 'reduce-motion' : ''}`} style={accentStyle}>
      <div className="desktop-wallpaper" aria-hidden="true" style={settings.wallpaper === 'custom' && settings.customWallpaper ? { backgroundImage: `linear-gradient(145deg, rgba(4,6,15,.28), rgba(18,8,40,.18)), url(${settings.customWallpaper})` } : undefined}><i className="beam beam-one" /><i className="beam beam-two" /><i className="glow glow-one" /><i className="glow glow-two" /><i className="stars" /></div>

      {stage === 'boot' && <BootScreen />}
      {stage === 'login' && <LoginScreen now={now} password={loginPassword} setPassword={setLoginPassword} login={login} powerOpen={powerOpen} setPowerOpen={setPowerOpen} restart={restart} shutdown={shutdown} />}
      {stage === 'welcome' && <WelcomeScreen />}
      {stage === 'shutdown' && <ShutdownScreen restart={restart} />}

      {stage === 'desktop' && (
        <section
          className="desktop"
          onPointerDown={beginDesktopSelection}
          onContextMenu={event => {
            event.preventDefault()
            setSelectionBox(null)
            setContextMenu({ x: event.clientX, y: event.clientY })
          }}
        >
          <div className="desktop-icons">
            {desktopApps.map((app, index) => {
              const position = desktopPositions[app.id] ?? defaultDesktopPosition(index)
              return <button
                key={app.id}
                className={`desktop-icon ${selectedDesktop.includes(app.id) ? 'selected' : ''}`}
                style={{ left: position.x, top: position.y }}
                onPointerDown={event => beginDesktopIconDrag(event, app.id, index)}
                onClick={event => { event.stopPropagation(); setSelectedDesktop([app.id]) }}
                onDoubleClick={() => openApp(app.id)}
              >
                <span className={`app-tile ${app.className}`}>{app.icon}</span>
                {settings.showDesktopLabels && <span>{app.name}</span>}
              </button>
            })}
          </div>

          {selectionBox && <div className="desktop-selection" style={selectionBox} />}
          {snapPreview && <SnapPreview mode={snapPreview} />}

          <div className={`window-layer ${peekDesktop ? 'peek-desktop' : ''}`}>
            {windows.map(item => {
              if (item.minimized) return null
              const app = appById[item.appId]
              return <article
                key={item.id}
                className={`os-window ${item.maximized ? 'maximized' : ''} ${item.motion ? `window-${item.motion}` : ''}`}
                style={item.maximized ? { zIndex: item.z } : { zIndex: item.z, left: item.x, top: item.y, width: item.width, height: item.height }}
                onPointerDown={event => { event.stopPropagation(); focusWindow(item.id) }}
              >
                <header className="window-titlebar" onPointerDown={event => beginDrag(event, item)} onDoubleClick={() => toggleMaximize(item.id)}>
                  <div className="window-title"><span className={`mini-tile ${app.className}`}>{app.icon}</span><span>{app.name}</span></div>
                  <div className="window-controls" onDoubleClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
                    <button aria-label="Minimize" onClick={() => minimizeWindow(item.id)}>—</button>
                    <button aria-label="Maximize" onClick={() => toggleMaximize(item.id)}>□</button>
                    <button className="close" aria-label="Close" onClick={() => closeWindow(item.id)}>×</button>
                  </div>
                </header>
                <div className="window-menu"><button>File</button><button>Edit</button><button>View</button><button>Help</button></div>
                <div className="window-body"><AppContent appId={item.appId} settings={settings} updateSettings={setSettings} openApp={openApp} onReset={reset} /></div>
                {!item.maximized && <button className="resize-handle" aria-label="Resize window" onPointerDown={event => beginResize(event, item)} />}
              </article>
            })}
          </div>

          {contextMenu && <div className="desktop-context" style={{ left: Math.min(contextMenu.x, window.innerWidth - 210), top: Math.min(contextMenu.y, window.innerHeight - 260) }} onPointerDown={event => event.stopPropagation()}>
            <button>View <span>›</span></button>
            <button onClick={() => setToast('Desktop refreshed')}>Refresh</button>
            <hr />
            <button>New <span>›</span></button>
            <hr />
            <button onClick={() => openApp('themes')}>Personalize</button>
            <button onClick={() => openApp('settings')}>Screen resolution</button>
          </div>}

          {startOpen && <StartMenu search={search} setSearch={setSearch} apps={filteredApps} recentApps={recentApps} openApp={openApp} signOut={signOut} setPowerOpen={setPowerOpen} powerOpen={powerOpen} shutdown={shutdown} restart={restart} />}
          {calendarOpen && <CalendarPanel now={now} />}
          {trayPanel === 'network' && <NetworkFlyout />}
          {trayPanel === 'volume' && <VolumeFlyout settings={settings} updateSettings={setSettings} testSound={() => playSystemSound('notify', settings)} />}
          {trayPanel === 'notifications' && <NotificationFlyout notifications={notifications} clear={() => setNotifications([])} />}
          {altTab.open && <AltTabSwitcher windows={sortedWindows} index={altTab.index} />}
          {toast && <div className="toast glass-panel"><span className="toast-mark">L</span><div><strong>LuxOS</strong><small>{toast}</small></div></div>}

          <Taskbar
            now={now}
            windows={windows}
            startOpen={startOpen}
            setStartOpen={value => { setStartOpen(value); setCalendarOpen(false); setTrayPanel(null) }}
            openApp={openApp}
            focusWindow={focusWindow}
            closeWindow={closeWindow}
            setWindows={setWindows}
            minimizeWindow={minimizeWindow}
            pinnedOrder={pinnedOrder}
            setPinnedOrder={setPinnedOrder}
            setPeekDesktop={setPeekDesktop}
            notificationCount={notifications.length}
            calendarOpen={calendarOpen}
            setCalendarOpen={value => { setCalendarOpen(value); setTrayPanel(null); setStartOpen(false) }}
            trayPanel={trayPanel}
            setTrayPanel={value => { setTrayPanel(value); setCalendarOpen(false); setStartOpen(false) }}
          />
        </section>
      )}
    </main>
  )
}

function SnapPreview({ mode }: { mode: Exclude<SnapMode, null> }) {
  return <div className={`snap-preview snap-${mode}`}><span /></div>
}

function BootScreen() {
  return <section className="session-screen boot-screen"><div className="boot-brand"><span className="lux-orb">L</span><div><strong>LuxOS</strong><small>Desktop 0.4</small></div></div><div className="boot-dots"><i /><i /><i /><i /></div><small className="session-copyright">© Lux</small></section>
}

function LoginScreen({ now, password, setPassword, login, powerOpen, setPowerOpen, restart, shutdown }: { now: Date; password: string; setPassword: (value: string) => void; login: () => void; powerOpen: boolean; setPowerOpen: (value: boolean) => void; restart: () => void; shutdown: () => void }) {
  return <section className="session-screen login-screen"><div className="login-brand"><span className="brand-gem">L</span><strong>LuxOS</strong></div><div className="login-card"><div className="user-avatar"><span>L</span></div><h1>Lux</h1><form onSubmit={event => { event.preventDefault(); login() }}><div className="password-wrap"><input type="password" autoFocus value={password} onChange={event => setPassword(event.target.value)} placeholder="Password" aria-label="Password" /><button aria-label="Sign in">→</button></div></form><button className="switch-user">Switch user</button></div><footer className="login-footer"><div><strong>{formatTime(now)}</strong><small>{formatDate(now)}</small></div><div className="login-access"><button title="Accessibility">◉</button><button title="Network">⌁</button><div className="power-anchor"><button className="power-button" title="Power" onClick={() => setPowerOpen(!powerOpen)}>⏻</button>{powerOpen && <div className="login-power-menu"><button onClick={restart}>Restart</button><button onClick={shutdown}>Shut down</button></div>}</div></div></footer></section>
}

function WelcomeScreen() {
  return <section className="session-screen welcome-screen"><div className="user-avatar small"><span>L</span></div><h1>Welcome</h1><div className="welcome-spinner"><i /><i /><i /><i /><i /></div><small>Restoring your desktop...</small></section>
}

function ShutdownScreen({ restart }: { restart: () => void }) {
  return <section className="session-screen shutdown-screen"><div className="boot-brand"><span className="lux-orb">L</span><div><strong>LuxOS</strong><small>Shutting down...</small></div></div><button onClick={restart}>Start LuxOS again</button></section>
}

function StartMenu({ search, setSearch, apps, recentApps, openApp, signOut, setPowerOpen, powerOpen, shutdown, restart }: { search: string; setSearch: (value: string) => void; apps: typeof import('./system/apps').apps; recentApps: AppId[]; openApp: (id: AppId) => void; signOut: () => void; setPowerOpen: (value: boolean) => void; powerOpen: boolean; shutdown: () => void; restart: () => void }) {
  const recent = recentApps.map(id => appById[id]).filter(Boolean)
  return <aside className="start-menu glass-panel start-menu-v4" onPointerDown={event => event.stopPropagation()}>
    <div className="start-user"><div className="start-avatar">L</div><div><strong>Lux</strong><small>LuxOS User</small></div></div>
    <div className="start-columns"><div className="start-left">
      {recent.length > 0 && !search && <div className="start-recent"><span className="start-section-label">Recently used</span>{recent.slice(0, 3).map(app => <button key={app.id} onClick={() => openApp(app.id)}><span className={`start-app-icon ${app.className}`}>{app.icon}</span><div><strong>{app.name}</strong><small>{app.subtitle}</small></div></button>)}</div>}
      <div className="start-app-list">{apps.map(app => <button key={app.id} onClick={() => openApp(app.id)}><span className={`start-app-icon ${app.className}`}>{app.icon}</span><div><strong>{app.name}</strong><small>{app.subtitle}</small></div></button>)}</div>
      <div className="start-search"><input autoFocus={false} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search programs and files" /><span>⌕</span></div>
    </div><div className="start-right"><button onClick={() => openApp('files')}>Computer</button><button onClick={() => openApp('files')}>Documents</button><button onClick={() => openApp('gallery')}>Pictures</button><button onClick={() => openApp('projects')}>Projects</button><hr /><button onClick={() => openApp('settings')}>Control Panel</button><button onClick={() => openApp('themes')}>Personalize</button><button onClick={() => openApp('lux')}>Help and Support</button></div></div>
    <div className="start-footer"><button className="signout" onClick={signOut}>Lock</button><div className="start-power"><button onClick={shutdown}>Shut down</button><button className="power-arrow" onClick={() => setPowerOpen(!powerOpen)}>▴</button>{powerOpen && <div className="power-flyout"><button onClick={signOut}>Log off</button><button onClick={restart}>Restart</button><button onClick={shutdown}>Shut down</button></div>}</div></div>
  </aside>
}

function Taskbar({ now, windows, startOpen, setStartOpen, openApp, focusWindow, closeWindow, setWindows, minimizeWindow, pinnedOrder, setPinnedOrder, setPeekDesktop, notificationCount, calendarOpen, setCalendarOpen, trayPanel, setTrayPanel }: { now: Date; windows: WindowState[]; startOpen: boolean; setStartOpen: (value: boolean) => void; openApp: (id: AppId) => void; focusWindow: (id: number) => void; closeWindow: (id: number) => void; setWindows: Dispatch<SetStateAction<WindowState[]>>; minimizeWindow: (id: number) => void; pinnedOrder: AppId[]; setPinnedOrder: Dispatch<SetStateAction<AppId[]>>; setPeekDesktop: (value: boolean) => void; notificationCount: number; calendarOpen: boolean; setCalendarOpen: (value: boolean) => void; trayPanel: TrayPanel; setTrayPanel: (value: TrayPanel) => void }) {
  const [hoveredWindow, setHoveredWindow] = useState<number | null>(null)
  const topVisible = [...windows].filter(item => !item.minimized).sort((a, b) => b.z - a.z)[0]

  const toggleWindow = (item: WindowState) => {
    if (item.minimized || topVisible?.id !== item.id) focusWindow(item.id)
    else minimizeWindow(item.id)
  }

  const movePin = (dragged: AppId, target: AppId) => {
    if (dragged === target) return
    setPinnedOrder(current => {
      const next = current.filter(id => id !== dragged)
      const index = next.indexOf(target)
      next.splice(index < 0 ? next.length : index, 0, dragged)
      return next
    })
  }

  const renderSlot = (appId: AppId, compact = true) => {
    const app = appById[appId]
    const running = windows.find(win => win.appId === appId)
    return <div className="taskbar-slot" key={appId} draggable onDragStart={event => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/lux-pin', appId) }} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const dragged = event.dataTransfer.getData('text/lux-pin') as AppId; if (dragged) movePin(dragged, appId) }} onPointerEnter={() => running && setHoveredWindow(running.id)} onPointerLeave={() => setHoveredWindow(current => current === running?.id ? null : current)}>
      <button className={`taskbar-app ${running ? 'running' : ''} ${running && topVisible?.id === running.id ? 'active' : ''}`} onClick={() => running ? toggleWindow(running) : openApp(appId)} title={`${app.name} • drag to reorder`}><span className={`task-icon ${app.className}`}>{app.icon}</span>{!compact && <span>{app.name}</span>}</button>
      {running && hoveredWindow === running.id && <TaskbarPreview item={running} closeWindow={closeWindow} focusWindow={focusWindow} />}
    </div>
  }

  return <footer className="taskbar taskbar-v4" onPointerDown={event => event.stopPropagation()}>
    <button className={`start-orb ${startOpen ? 'active' : ''}`} onClick={() => setStartOpen(!startOpen)} aria-label="Start"><span>L</span></button>
    <div className="taskbar-pinned">{pinnedOrder.map(appId => renderSlot(appId))}</div>
    <div className="taskbar-running">{windows.filter(win => !pinnedOrder.includes(win.appId)).map(win => <div className="taskbar-slot running-slot" key={win.id} onPointerEnter={() => setHoveredWindow(win.id)} onPointerLeave={() => setHoveredWindow(current => current === win.id ? null : current)}><button className={`running-button ${topVisible?.id === win.id && !win.minimized ? 'active' : ''}`} onClick={() => toggleWindow(win)}><span className={`task-icon ${appById[win.appId].className}`}>{appById[win.appId].icon}</span><span>{appById[win.appId].name}</span></button>{hoveredWindow === win.id && <TaskbarPreview item={win} closeWindow={closeWindow} focusWindow={focusWindow} />}</div>)}</div>
    <div className="system-tray">
      <button title="Hidden icons">▴</button>
      <button className={trayPanel === 'network' ? 'active' : ''} title="Network" onClick={() => setTrayPanel(trayPanel === 'network' ? null : 'network')}>⌁</button>
      <button className={trayPanel === 'volume' ? 'active' : ''} title="Volume" onClick={() => setTrayPanel(trayPanel === 'volume' ? null : 'volume')}>◖</button>
      <button className={`notification-tray ${trayPanel === 'notifications' ? 'active' : ''}`} title="Notifications" onClick={() => setTrayPanel(trayPanel === 'notifications' ? null : 'notifications')}><span>◇</span>{notificationCount > 0 && <i>{notificationCount > 9 ? '9+' : notificationCount}</i>}</button>
      <button className={`tray-clock ${calendarOpen ? 'active' : ''}`} onClick={() => setCalendarOpen(!calendarOpen)}><strong>{formatTime(now)}</strong><small>{now.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' })}</small></button>
      <button className="show-desktop" onPointerEnter={() => setPeekDesktop(true)} onPointerLeave={() => setPeekDesktop(false)} onClick={() => { setPeekDesktop(false); setWindows(current => current.map(win => ({ ...win, minimized: true }))) }} title="Show desktop / Aero Peek" />
    </div>
  </footer>
}

function TaskbarPreview({ item, closeWindow, focusWindow }: { item: WindowState; closeWindow: (id: number) => void; focusWindow: (id: number) => void }) {
  const app = appById[item.appId]
  return <div className="taskbar-preview" onClick={() => focusWindow(item.id)}><div className="preview-title"><span className={`task-icon ${app.className}`}>{app.icon}</span><strong>{app.name}</strong><button aria-label={`Close ${app.name}`} onClick={event => { event.stopPropagation(); closeWindow(item.id) }}>×</button></div><div className="preview-screen"><span className={`preview-app-icon ${app.className}`}>{app.icon}</span><small>{app.subtitle}</small></div></div>
}

function AltTabSwitcher({ windows, index }: { windows: WindowState[]; index: number }) {
  if (windows.length === 0) return null
  return <div className="alt-tab-backdrop"><div className="alt-tab-switcher glass-panel"><div className="alt-tab-title">Switch windows</div><div className="alt-tab-grid">{windows.map((item, itemIndex) => { const app = appById[item.appId]; return <div key={item.id} className={`alt-tab-item ${itemIndex === index % windows.length ? 'active' : ''}`}><span className={`alt-tab-icon ${app.className}`}>{app.icon}</span><strong>{app.name}</strong><small>{item.minimized ? 'Minimized' : app.subtitle}</small></div> })}</div><small className="alt-tab-hint">Hold Alt and tap Tab</small></div></div>
}

function NetworkFlyout() {
  return <aside className="tray-flyout network-flyout glass-panel" onPointerDown={event => event.stopPropagation()}><div className="flyout-heading"><strong>Network</strong><small>Connected</small></div><button className="network-entry"><span className="wifi-bars"><i /><i /><i /></span><div><strong>LuxNet</strong><small>Internet access</small></div><em>Connected</em></button><div className="flyout-footer">Network and sharing settings</div></aside>
}

function VolumeFlyout({ settings, updateSettings, testSound }: { settings: LuxSettings; updateSettings: (settings: LuxSettings) => void; testSound: () => void }) {
  return <aside className="tray-flyout volume-flyout glass-panel" onPointerDown={event => event.stopPropagation()}><div className="flyout-heading"><strong>Speakers</strong><small>LuxOS Audio</small></div><div className="volume-control"><span>◖</span><input aria-label="Master volume" type="range" min="0" max="100" value={settings.masterVolume} onChange={event => updateSettings({ ...settings, masterVolume: Number(event.target.value) })} onPointerUp={testSound} /><strong>{settings.masterVolume}</strong></div><button className="mixer-button" onClick={testSound}>Test system sound</button></aside>
}

function NotificationFlyout({ notifications, clear }: { notifications: Array<{ id: number; title: string; message: string; time: string }>; clear: () => void }) {
  return <aside className="tray-flyout notification-flyout glass-panel" onPointerDown={event => event.stopPropagation()}><div className="notification-header"><div><strong>Notifications</strong><small>{notifications.length ? `${notifications.length} new` : 'You’re all caught up'}</small></div>{notifications.length > 0 && <button onClick={clear}>Clear all</button>}</div><div className="notification-list">{notifications.length ? notifications.map(item => <article key={item.id}><span className="notification-mark">L</span><div><div><strong>{item.title}</strong><time>{item.time}</time></div><p>{item.message}</p></div></article>) : <div className="notification-empty"><span>◇</span><strong>No new notifications</strong><small>LuxOS will surface system activity here.</small></div>}</div></aside>
}

function CalendarPanel({ now }: { now: Date }) {
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const count = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const cells: Array<number | null> = [
    ...Array.from({ length: first.getDay() }, () => null),
    ...Array.from({ length: count }, (_, index) => index + 1),
  ]
  return <aside className="calendar-panel glass-panel" onPointerDown={event => event.stopPropagation()}><div className="calendar-time">{formatTime(now)}</div><div className="calendar-date">{formatDate(now)}</div><div className="calendar-month"><strong>{now.toLocaleDateString([], { month: 'long', year: 'numeric' })}</strong><div className="week-row">{'SMTWTFS'.split('').map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="days-grid">{cells.map((day, index) => <span key={index} className={day === now.getDate() ? 'today' : ''}>{day}</span>)}</div></div></aside>
}
