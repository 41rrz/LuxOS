import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, Dispatch, PointerEvent as ReactPointerEvent, SetStateAction } from 'react'
import { AppContent } from './apps/AppContent'
import { appById, apps, desktopApps, pinnedApps } from './system/apps'
import { defaultSettings, loadSettings, resetLuxStorage, saveSettings } from './system/storage'
import type { AppId, LuxSettings, SessionStage, WindowState } from './system/types'

const TASKBAR_HEIGHT = 48
let windowSequence = 1

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatDate(date: Date) {
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export default function App() {
  const [stage, setStage] = useState<SessionStage>('boot')
  const [now, setNow] = useState(new Date())
  const [settings, setSettings] = useState<LuxSettings>(loadSettings)
  const [windows, setWindows] = useState<WindowState[]>([])
  const [startOpen, setStartOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedDesktop, setSelectedDesktop] = useState<AppId | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [powerOpen, setPowerOpen] = useState(false)
  const [loginPassword, setLoginPassword] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const zRef = useRef(10)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => saveSettings(settings), [settings])

  useEffect(() => {
    if (stage !== 'boot') return
    const timer = window.setTimeout(() => setStage('login'), settings.reduceMotion ? 300 : 1500)
    return () => window.clearTimeout(timer)
  }, [stage, settings.reduceMotion])

  useEffect(() => {
    const closeMenus = () => setContextMenu(null)
    window.addEventListener('pointerdown', closeMenus)
    return () => window.removeEventListener('pointerdown', closeMenus)
  }, [])

  const accentStyle = useMemo(() => ({ '--glass-strength': `${settings.glassIntensity / 100}` } as CSSProperties), [settings.glassIntensity])

  const focusWindow = (id: number) => {
    const z = ++zRef.current
    setWindows(current => current.map(item => item.id === id ? { ...item, z, minimized: false } : item))
  }

  const openApp = (appId: AppId) => {
    setStartOpen(false)
    setContextMenu(null)
    setCalendarOpen(false)
    const existing = windows.find(item => item.appId === appId)
    if (existing) {
      focusWindow(existing.id)
      return
    }
    const app = appById[appId]
    const maxWidth = Math.max(320, window.innerWidth - 40)
    const maxHeight = Math.max(260, window.innerHeight - TASKBAR_HEIGHT - 40)
    const width = Math.min(app.width, maxWidth)
    const height = Math.min(app.height, maxHeight)
    const cascade = (windows.length % 6) * 26
    const x = clamp((window.innerWidth - width) / 2 + cascade - 55, 8, Math.max(8, window.innerWidth - width - 8))
    const y = clamp((window.innerHeight - TASKBAR_HEIGHT - height) / 2 + cascade - 30, 8, Math.max(8, window.innerHeight - TASKBAR_HEIGHT - height - 8))
    const z = ++zRef.current
    setWindows(current => [...current, { id: windowSequence++, appId, x, y, width, height, z, minimized: false, maximized: false }])
  }

  const closeWindow = (id: number) => setWindows(current => current.filter(item => item.id !== id))
  const minimizeWindow = (id: number) => setWindows(current => current.map(item => item.id === id ? { ...item, minimized: true } : item))

  const toggleMaximize = (id: number) => {
    setWindows(current => current.map(item => {
      if (item.id !== id) return item
      if (item.maximized && item.restore) return { ...item, ...item.restore, maximized: false, restore: undefined }
      return { ...item, maximized: true, restore: { x: item.x, y: item.y, width: item.width, height: item.height } }
    }))
    focusWindow(id)
  }

  const beginDrag = (event: ReactPointerEvent, item: WindowState) => {
    if (item.maximized || event.button !== 0) return
    event.preventDefault()
    focusWindow(item.id)
    const startX = event.clientX
    const startY = event.clientY
    const startLeft = item.x
    const startTop = item.y
    const onMove = (move: PointerEvent) => {
      const x = clamp(startLeft + move.clientX - startX, -item.width + 120, window.innerWidth - 120)
      const y = clamp(startTop + move.clientY - startY, 0, window.innerHeight - TASKBAR_HEIGHT - 34)
      setWindows(current => current.map(win => win.id === item.id ? { ...win, x, y } : win))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
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
      const width = clamp(startWidth + move.clientX - startX, 420, window.innerWidth - item.x)
      const height = clamp(startHeight + move.clientY - startY, 300, window.innerHeight - TASKBAR_HEIGHT - item.y)
      setWindows(current => current.map(win => win.id === item.id ? { ...win, width, height } : win))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const login = () => {
    setStage('welcome')
    setLoginPassword('')
    window.setTimeout(() => {
      setStage('desktop')
      setToast('Welcome to LuxOS Desktop')
      window.setTimeout(() => setToast(null), 3200)
    }, settings.reduceMotion ? 250 : 1200)
  }

  const signOut = () => {
    setWindows([])
    setStartOpen(false)
    setPowerOpen(false)
    setStage('login')
  }

  const restart = () => {
    setPowerOpen(false)
    setWindows([])
    setStage('boot')
  }

  const shutdown = () => {
    setPowerOpen(false)
    setStage('shutdown')
  }

  const reset = () => {
    resetLuxStorage()
    setSettings(defaultSettings)
  }

  const filteredApps = apps.filter(app => `${app.name} ${app.subtitle}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <main className={`luxos desktop-os accent-${settings.accent} ${settings.reduceMotion ? 'reduce-motion' : ''}`} style={accentStyle}>
      <div className="desktop-wallpaper" aria-hidden="true"><i className="beam beam-one" /><i className="beam beam-two" /><i className="glow glow-one" /><i className="glow glow-two" /><i className="stars" /></div>

      {stage === 'boot' && <BootScreen />}
      {stage === 'login' && <LoginScreen now={now} password={loginPassword} setPassword={setLoginPassword} login={login} powerOpen={powerOpen} setPowerOpen={setPowerOpen} restart={restart} shutdown={shutdown} />}
      {stage === 'welcome' && <WelcomeScreen />}
      {stage === 'shutdown' && <ShutdownScreen restart={restart} />}

      {stage === 'desktop' && (
        <section className="desktop" onPointerDown={() => { setStartOpen(false); setCalendarOpen(false); setPowerOpen(false) }} onContextMenu={event => { event.preventDefault(); setContextMenu({ x: event.clientX, y: event.clientY }) }}>
          <div className="desktop-icons">
            {desktopApps.map(app => <button key={app.id} className={`desktop-icon ${selectedDesktop === app.id ? 'selected' : ''}`} onClick={event => { event.stopPropagation(); setSelectedDesktop(app.id) }} onDoubleClick={() => openApp(app.id)}><span className={`app-tile ${app.className}`}>{app.icon}</span>{settings.showDesktopLabels && <span>{app.name}</span>}</button>)}
          </div>

          <div className="window-layer">
            {windows.map(item => {
              if (item.minimized) return null
              const app = appById[item.appId]
              return <article key={item.id} className={`os-window ${item.maximized ? 'maximized' : ''}`} style={item.maximized ? { zIndex: item.z } : { zIndex: item.z, left: item.x, top: item.y, width: item.width, height: item.height }} onPointerDown={() => focusWindow(item.id)}>
                <header className="window-titlebar" onPointerDown={event => beginDrag(event, item)} onDoubleClick={() => toggleMaximize(item.id)}>
                  <div className="window-title"><span className={`mini-tile ${app.className}`}>{app.icon}</span><span>{app.name}</span></div>
                  <div className="window-controls" onDoubleClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}><button aria-label="Minimize" onClick={() => minimizeWindow(item.id)}>—</button><button aria-label="Maximize" onClick={() => toggleMaximize(item.id)}>□</button><button className="close" aria-label="Close" onClick={() => closeWindow(item.id)}>×</button></div>
                </header>
                <div className="window-menu"><button>File</button><button>Edit</button><button>View</button><button>Help</button></div>
                <div className="window-body"><AppContent appId={item.appId} settings={settings} updateSettings={setSettings} openApp={openApp} onReset={reset} /></div>
                {!item.maximized && <button className="resize-handle" aria-label="Resize window" onPointerDown={event => beginResize(event, item)} />}
              </article>
            })}
          </div>

          {contextMenu && <div className="desktop-context" style={{ left: Math.min(contextMenu.x, window.innerWidth - 210), top: Math.min(contextMenu.y, window.innerHeight - 260) }} onPointerDown={event => event.stopPropagation()}><button>View <span>›</span></button><button onClick={() => setToast('Desktop refreshed')}>Refresh</button><hr /><button>New <span>›</span></button><hr /><button onClick={() => openApp('themes')}>Personalize</button><button onClick={() => openApp('settings')}>Screen resolution</button></div>}

          {startOpen && <StartMenu search={search} setSearch={setSearch} apps={filteredApps} openApp={openApp} signOut={signOut} setPowerOpen={setPowerOpen} powerOpen={powerOpen} shutdown={shutdown} restart={restart} />}
          {calendarOpen && <CalendarPanel now={now} />}
          {toast && <div className="toast glass-panel"><span className="toast-mark">L</span><div><strong>LuxOS</strong><small>{toast}</small></div></div>}

          <Taskbar now={now} windows={windows} startOpen={startOpen} setStartOpen={setStartOpen} openApp={openApp} focusWindow={focusWindow} setWindows={setWindows} calendarOpen={calendarOpen} setCalendarOpen={setCalendarOpen} />
        </section>
      )}
    </main>
  )
}

function BootScreen() {
  return <section className="session-screen boot-screen"><div className="boot-brand"><span className="lux-orb">L</span><div><strong>LuxOS</strong><small>Desktop</small></div></div><div className="boot-dots"><i /><i /><i /><i /></div><small className="session-copyright">© Lux</small></section>
}

function LoginScreen({ now, password, setPassword, login, powerOpen, setPowerOpen, restart, shutdown }: { now: Date; password: string; setPassword: (value: string) => void; login: () => void; powerOpen: boolean; setPowerOpen: (value: boolean) => void; restart: () => void; shutdown: () => void }) {
  return <section className="session-screen login-screen"><div className="login-brand"><span className="brand-gem">L</span><strong>LuxOS</strong></div><div className="login-card"><div className="user-avatar"><span>L</span></div><h1>Lux</h1><form onSubmit={event => { event.preventDefault(); login() }}><div className="password-wrap"><input type="password" autoFocus value={password} onChange={event => setPassword(event.target.value)} placeholder="Password" aria-label="Password" /><button aria-label="Sign in">→</button></div></form><button className="switch-user">Switch user</button></div><footer className="login-footer"><div><strong>{formatTime(now)}</strong><small>{formatDate(now)}</small></div><div className="login-access"><button title="Accessibility">◉</button><button title="Network">⌁</button><div className="power-anchor"><button className="power-button" title="Power" onClick={() => setPowerOpen(!powerOpen)}>⏻</button>{powerOpen && <div className="login-power-menu"><button onClick={restart}>Restart</button><button onClick={shutdown}>Shut down</button></div>}</div></div></footer></section>
}

function WelcomeScreen() {
  return <section className="session-screen welcome-screen"><div className="user-avatar small"><span>L</span></div><h1>Welcome</h1><div className="welcome-spinner"><i /><i /><i /><i /><i /></div><small>Preparing your desktop...</small></section>
}

function ShutdownScreen({ restart }: { restart: () => void }) {
  return <section className="session-screen shutdown-screen"><div className="boot-brand"><span className="lux-orb">L</span><div><strong>LuxOS</strong><small>Shutting down...</small></div></div><button onClick={restart}>Start LuxOS again</button></section>
}

function StartMenu({ search, setSearch, apps, openApp, signOut, setPowerOpen, powerOpen, shutdown, restart }: { search: string; setSearch: (value: string) => void; apps: typeof import('./system/apps').apps; openApp: (id: AppId) => void; signOut: () => void; setPowerOpen: (value: boolean) => void; powerOpen: boolean; shutdown: () => void; restart: () => void }) {
  return <aside className="start-menu glass-panel" onPointerDown={event => event.stopPropagation()}><div className="start-user"><div className="start-avatar">L</div><div><strong>Lux</strong><small>LuxOS User</small></div></div><div className="start-columns"><div className="start-left"><div className="start-app-list">{apps.map(app => <button key={app.id} onClick={() => openApp(app.id)}><span className={`start-app-icon ${app.className}`}>{app.icon}</span><div><strong>{app.name}</strong><small>{app.subtitle}</small></div></button>)}</div><div className="start-search"><input autoFocus={false} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search programs and files" /><span>⌕</span></div></div><div className="start-right"><button onClick={() => openApp('files')}>Documents</button><button onClick={() => openApp('gallery')}>Pictures</button><button onClick={() => openApp('projects')}>Projects</button><hr /><button onClick={() => openApp('settings')}>Control Panel</button><button onClick={() => openApp('settings')}>Devices</button><button onClick={() => openApp('lux')}>Help and Support</button></div></div><div className="start-footer"><button className="signout" onClick={signOut}>Lock</button><div className="start-power"><button onClick={shutdown}>Shut down</button><button className="power-arrow" onClick={() => setPowerOpen(!powerOpen)}>▴</button>{powerOpen && <div className="power-flyout"><button onClick={signOut}>Log off</button><button onClick={restart}>Restart</button><button onClick={shutdown}>Shut down</button></div>}</div></div></aside>
}

function Taskbar({ now, windows, startOpen, setStartOpen, openApp, focusWindow, setWindows, calendarOpen, setCalendarOpen }: { now: Date; windows: WindowState[]; startOpen: boolean; setStartOpen: (value: boolean) => void; openApp: (id: AppId) => void; focusWindow: (id: number) => void; setWindows: Dispatch<SetStateAction<WindowState[]>>; calendarOpen: boolean; setCalendarOpen: (value: boolean) => void }) {
  const toggleWindow = (item: WindowState) => {
    if (item.minimized) focusWindow(item.id)
    else setWindows(current => current.map(win => win.id === item.id ? { ...win, minimized: true } : win))
  }
  return <footer className="taskbar" onPointerDown={event => event.stopPropagation()}><button className={`start-orb ${startOpen ? 'active' : ''}`} onClick={() => setStartOpen(!startOpen)} aria-label="Start"><span>L</span></button><div className="taskbar-pinned">{pinnedApps.map(app => <button key={app.id} className={`taskbar-app ${windows.some(win => win.appId === app.id) ? 'running' : ''}`} onClick={() => { const running = windows.find(win => win.appId === app.id); running ? toggleWindow(running) : openApp(app.id) }} title={app.name}><span className={`task-icon ${app.className}`}>{app.icon}</span></button>)}</div><div className="taskbar-running">{windows.filter(win => !pinnedApps.some(app => app.id === win.appId)).map(win => <button key={win.id} className="running-button" onClick={() => toggleWindow(win)}><span className={`task-icon ${appById[win.appId].className}`}>{appById[win.appId].icon}</span><span>{appById[win.appId].name}</span></button>)}</div><div className="system-tray"><button title="Hidden icons">▴</button><button title="Network">⌁</button><button title="Volume">◖</button><button className={`tray-clock ${calendarOpen ? 'active' : ''}`} onClick={() => setCalendarOpen(!calendarOpen)}><strong>{formatTime(now)}</strong><small>{now.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' })}</small></button><button className="show-desktop" onClick={() => setWindows(current => current.map(win => ({ ...win, minimized: true })))} title="Show desktop" /></div></footer>
}

function CalendarPanel({ now }: { now: Date }) {
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const count = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: first.getDay() }, () => null).concat(Array.from({ length: count }, (_, index) => index + 1))
  return <aside className="calendar-panel glass-panel" onPointerDown={event => event.stopPropagation()}><div className="calendar-time">{formatTime(now)}</div><div className="calendar-date">{formatDate(now)}</div><div className="calendar-month"><strong>{now.toLocaleDateString([], { month: 'long', year: 'numeric' })}</strong><div className="week-row">{'SMTWTFS'.split('').map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="days-grid">{cells.map((day, index) => <span key={index} className={day === now.getDate() ? 'today' : ''}>{day}</span>)}</div></div></aside>
}
