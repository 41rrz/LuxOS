import { useEffect, useMemo, useState } from 'react'
import type { Accent, AppId, LuxSettings } from '../system/types'
import { loadNotes, saveNotes } from '../system/storage'

interface Props {
  appId: AppId
  settings: LuxSettings
  updateSettings: (settings: LuxSettings) => void
  openApp: (id: AppId) => void
  onReset: () => void
}

const accents: Accent[] = ['violet', 'blue', 'pink', 'orange', 'green']

function LuxHome({ openApp }: Pick<Props, 'openApp'>) {
  return (
    <div className="app-page lux-home-page">
      <section className="aero-hero">
        <div>
          <span className="kicker">LUXOS DESKTOP</span>
          <h1>Welcome to LuxOS.</h1>
          <p>A browser desktop built around your projects, media, tools and experiments.</p>
        </div>
        <div className="hero-mark">L</div>
      </section>
      <div className="quick-grid">
        <button onClick={() => openApp('projects')}><strong>Projects</strong><small>Open your workspace</small></button>
        <button onClick={() => openApp('gallery')}><strong>Gallery</strong><small>Browse artwork & media</small></button>
        <button onClick={() => openApp('files')}><strong>Computer</strong><small>Explore LuxOS storage</small></button>
      </div>
      <section className="info-panel">
        <div><span>Edition</span><strong>LuxOS Desktop</strong></div>
        <div><span>Version</span><strong>0.2 Preview</strong></div>
        <div><span>Runtime</span><strong>Web / GitHub Pages</strong></div>
      </section>
    </div>
  )
}

function FileExplorer() {
  const folders = ['Desktop', 'Documents', 'Pictures', 'Projects', 'Downloads', 'Lux Archive']
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <div className="explorer-shell">
      <aside className="explorer-sidebar">
        <strong>Favorites</strong>
        {['Desktop', 'Downloads', 'Recent Places'].map(item => <button key={item}>{item}</button>)}
        <strong>Libraries</strong>
        {['Documents', 'Pictures', 'Projects'].map(item => <button key={item}>{item}</button>)}
      </aside>
      <section className="explorer-main">
        <div className="explorer-toolbar"><button>←</button><button>→</button><div>Computer ▸ LuxOS (C:)</div><input placeholder="Search Computer" /></div>
        <div className="folder-grid">
          {folders.map((folder, index) => (
            <button key={folder} className={selected === folder ? 'selected' : ''} onClick={() => setSelected(folder)}>
              <span className={`folder-icon folder-${index}`} />
              <strong>{folder}</strong>
              <small>{index % 2 ? 'Folder' : 'System folder'}</small>
            </button>
          ))}
        </div>
        <div className="drive-row"><span className="drive-icon" /><div><strong>Local Disk (C:)</strong><div className="drive-meter"><i /></div><small>82 GB free of 128 GB</small></div></div>
      </section>
    </div>
  )
}

function Gallery() {
  const cards = ['AURA', 'NOAH', 'LUX', 'AIRZ', 'VOID', 'ARCHIVE']
  return <div className="app-page"><div className="page-heading"><span>Pictures Library</span><h2>Gallery</h2></div><div className="desktop-gallery">{cards.map((card, index) => <button className={`media-card media-${index + 1}`} key={card}><span>{card}</span></button>)}</div></div>
}

function Notes() {
  const [value, setValue] = useState(loadNotes)
  useEffect(() => saveNotes(value), [value])
  return <div className="notes-shell"><div className="notes-ribbon"><button>New</button><button>Save</button><button>Format</button><span>Saved automatically</span></div><textarea value={value} onChange={event => setValue(event.target.value)} placeholder="Type a note..." /></div>
}

function Projects() {
  const projects = [
    ['LuxOS', 'Active', 'Desktop web OS'],
    ['LuxWorkflow', 'Active', 'Warehouse workflow app'],
    ['Lux Scan Bridge', 'Concept', 'Desktop utilities'],
    ['VR Projects', 'Prototype', 'Roblox & PCVR experiments'],
  ]
  return <div className="app-page"><div className="page-heading"><span>Workspace</span><h2>Projects</h2></div><div className="project-list">{projects.map(([name, state, description]) => <button key={name}><span className="project-orb" /><div><strong>{name}</strong><small>{description}</small></div><em>{state}</em></button>)}</div></div>
}

function Browser() {
  const [query, setQuery] = useState('')
  const target = useMemo(() => {
    const value = query.trim()
    if (!value) return ''
    return /^https?:\/\//i.test(value) ? value : `https://www.google.com/search?q=${encodeURIComponent(value)}`
  }, [query])
  const open = () => target && window.open(target, '_blank', 'noopener,noreferrer')
  return <div className="browser-shell"><div className="browser-chrome"><button>←</button><button>→</button><button>↻</button><input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => event.key === 'Enter' && open()} placeholder="Search or enter address" /><button onClick={open}>Go</button></div><div className="browser-start"><span className="browser-logo">L</span><h1>Lux Browser</h1><p>Search the web from LuxOS.</p><div className="browser-search"><input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => event.key === 'Enter' && open()} placeholder="Search the web" /><button onClick={open}>Search</button></div></div></div>
}

function Terminal() {
  const [lines, setLines] = useState(['LuxOS Command Shell [Version 0.2.0]', '(c) Lux. All rights reserved.', ''])
  const [command, setCommand] = useState('')
  const run = () => {
    const raw = command.trim()
    const cmd = raw.toLowerCase()
    if (!cmd) return
    if (cmd === 'clear' || cmd === 'cls') { setLines([]); setCommand(''); return }
    const response = cmd === 'help' ? 'Commands: help, ver, whoami, date, echo, clear' : cmd === 'ver' ? 'LuxOS Desktop 0.2.0' : cmd === 'whoami' ? 'lux-user' : cmd === 'date' ? new Date().toString() : cmd.startsWith('echo ') ? raw.slice(5) : `'${raw}' is not recognized as an internal command.`
    setLines(current => [...current, `C:\\Users\\Lux>${raw}`, response, ''])
    setCommand('')
  }
  return <div className="cmd-shell"><div>{lines.map((line, index) => <p key={`${index}-${line}`}>{line || '\u00a0'}</p>)}</div><label><span>C:\Users\Lux&gt;</span><input autoFocus value={command} onChange={event => setCommand(event.target.value)} onKeyDown={event => event.key === 'Enter' && run()} /></label></div>
}

function Themes({ settings, updateSettings }: Pick<Props, 'settings' | 'updateSettings'>) {
  return <div className="app-page"><div className="page-heading"><span>Personalization</span><h2>Choose your LuxOS color</h2></div><div className="wallpaper-sample"><span /><strong>Lux Aurora</strong><small>Default desktop background</small></div><div className="accent-picker">{accents.map(accent => <button key={accent} className={`accent-${accent} ${settings.accent === accent ? 'active' : ''}`} onClick={() => updateSettings({ ...settings, accent })}><span /><strong>{accent}</strong></button>)}</div></div>
}

function Settings({ settings, updateSettings, onReset, openApp }: Pick<Props, 'settings' | 'updateSettings' | 'onReset' | 'openApp'>) {
  return <div className="control-panel-page"><div className="control-panel-head"><span className="control-panel-mark">L</span><div><h2>Control Panel</h2><p>Adjust the way LuxOS looks and behaves.</p></div></div><div className="setting-categories"><button onClick={() => openApp('themes')}><span>◈</span><div><strong>Appearance and Personalization</strong><small>Colors, glass and desktop visuals</small></div></button><section><div><strong>Glass intensity</strong><small>{settings.glassIntensity}%</small></div><input type="range" min="35" max="100" value={settings.glassIntensity} onChange={event => updateSettings({ ...settings, glassIntensity: Number(event.target.value) })} /></section><section><div><strong>Reduce motion</strong><small>Use simpler desktop animations</small></div><button className={`toggle ${settings.reduceMotion ? 'on' : ''}`} onClick={() => updateSettings({ ...settings, reduceMotion: !settings.reduceMotion })}><i /></button></section><section><div><strong>Desktop icon labels</strong><small>Show names beneath desktop icons</small></div><button className={`toggle ${settings.showDesktopLabels ? 'on' : ''}`} onClick={() => updateSettings({ ...settings, showDesktopLabels: !settings.showDesktopLabels })}><i /></button></section></div><button className="reset-button" onClick={onReset}>Reset LuxOS local data</button></div>
}

export function AppContent(props: Props) {
  if (props.appId === 'lux') return <LuxHome openApp={props.openApp} />
  if (props.appId === 'files') return <FileExplorer />
  if (props.appId === 'gallery') return <Gallery />
  if (props.appId === 'notes') return <Notes />
  if (props.appId === 'projects') return <Projects />
  if (props.appId === 'browser') return <Browser />
  if (props.appId === 'terminal') return <Terminal />
  if (props.appId === 'themes') return <Themes settings={props.settings} updateSettings={props.updateSettings} />
  return <Settings settings={props.settings} updateSettings={props.updateSettings} onReset={props.onReset} openApp={props.openApp} />
}
