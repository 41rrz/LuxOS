import { useEffect, useState } from 'react'
import type { Accent, AppId, LuxSettings } from '../system/types'
import { loadNotes, saveNotes } from '../system/storage'

interface Props {
  appId: AppId
  settings: LuxSettings
  updateSettings: (next: LuxSettings) => void
  onReset: () => void
}

const accents: Accent[] = ['violet', 'blue', 'pink', 'orange', 'green']

function LuxHome() {
  return (
    <div className="app-content page-stack">
      <section className="hero-card glass-card">
        <div className="eyebrow">LUXOS / HOME</div>
        <h1>One place for everything Lux.</h1>
        <p>LuxOS is now running as a real app shell instead of a normal website. This dashboard can become the entry point for your portfolio, tools, downloads, experiments, and private utilities.</p>
      </section>
      <div className="card-grid">
        <article className="glass-card compact-card"><span>BUILD</span><strong>0.1.0</strong><small>Foundation</small></article>
        <article className="glass-card compact-card"><span>STATUS</span><strong>Online</strong><small>Browser runtime</small></article>
        <article className="glass-card compact-card"><span>MODE</span><strong>Local</strong><small>Data stays in this browser</small></article>
      </div>
    </div>
  )
}

function Gallery() {
  const items = ['AURA', 'NOAH', 'LUX', 'AIRZ', 'VOID', 'ARCHIVE']
  return (
    <div className="app-content">
      <div className="section-title"><span>Library</span><strong>Gallery</strong></div>
      <div className="gallery-grid">
        {items.map((item, i) => <div className={`gallery-tile tile-${i + 1}`} key={item}><span>{item}</span></div>)}
      </div>
    </div>
  )
}

function Notes() {
  const [value, setValue] = useState(() => loadNotes())
  useEffect(() => saveNotes(value), [value])
  return (
    <div className="app-content notes-app">
      <div className="section-title"><span>Local</span><strong>Notes</strong></div>
      <textarea value={value} onChange={event => setValue(event.target.value)} placeholder="Write something…" spellCheck />
      <small>Saved automatically on this device.</small>
    </div>
  )
}

function Projects() {
  const rows = [
    ['LuxOS', 'Active', 'Browser OS'],
    ['LuxWorkflow', 'Active', 'Inventory'],
    ['Lux Scan Bridge', 'Concept', 'Desktop'],
    ['VR Project', 'Prototype', 'Roblox'],
  ]
  return <div className="app-content"><div className="section-title"><span>Workspace</span><strong>Projects</strong></div><div className="list-card glass-card">{rows.map(([a,b,c]) => <div className="list-row" key={a}><div><strong>{a}</strong><small>{c}</small></div><span>{b}</span></div>)}</div></div>
}

function Files() {
  return <div className="app-content"><div className="section-title"><span>On LuxOS</span><strong>Files</strong></div><div className="file-grid">{['Images','Projects','Downloads','Themes','Archive','System'].map((name, i) => <div className="file-folder glass-card" key={name}><div className={`folder-mark f-${i}`} /><strong>{name}</strong><small>Empty for now</small></div>)}</div></div>
}

function Browser() {
  const [query, setQuery] = useState('')
  const open = () => {
    if (!query.trim()) return
    const target = /^https?:\/\//i.test(query) ? query : `https://www.google.com/search?q=${encodeURIComponent(query)}`
    window.open(target, '_blank', 'noopener,noreferrer')
  }
  return <div className="app-content browser-app"><div className="browser-hero"><span className="browser-orb" /><h1>Lux Browser</h1><p>Search the web or enter an address.</p></div><div className="browser-field glass-card"><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && open()} placeholder="Search or enter website" /><button onClick={open}>Go</button></div><small>Links open in a new browser tab because many websites block iframe embedding.</small></div>
}

function Themes({ settings, updateSettings }: Pick<Props, 'settings' | 'updateSettings'>) {
  return <div className="app-content"><div className="section-title"><span>Appearance</span><strong>Themes</strong></div><div className="theme-preview glass-card"><span className="wallpaper-preview" /><div><strong>Lux Aurora</strong><small>Dynamic dark gradient</small></div></div><div className="accent-grid">{accents.map(accent => <button key={accent} className={`accent-swatch swatch-${accent} ${settings.accent === accent ? 'selected' : ''}`} onClick={() => updateSettings({ ...settings, accent })}><span /><small>{accent}</small></button>)}</div></div>
}

function Terminal() {
  const [lines, setLines] = useState(['LuxOS shell v0.1.0', 'type “help” to begin'])
  const [cmd, setCmd] = useState('')
  const run = () => {
    const input = cmd.trim().toLowerCase()
    if (!input) return
    let response = `command not found: ${input}`
    if (input === 'help') response = 'commands: help, about, clear, date, whoami'
    if (input === 'about') response = 'LuxOS — browser operating system experience'
    if (input === 'date') response = new Date().toString()
    if (input === 'whoami') response = 'lux-user'
    if (input === 'clear') { setLines([]); setCmd(''); return }
    setLines(prev => [...prev, `lux@os ~ % ${cmd}`, response])
    setCmd('')
  }
  return <div className="terminal-app"><div className="terminal-output">{lines.map((line, i) => <div key={`${line}-${i}`}>{line}</div>)}</div><div className="terminal-input"><span>lux@os ~ %</span><input value={cmd} autoFocus onChange={e => setCmd(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()} /></div></div>
}

function Settings({ settings, updateSettings, onReset }: Omit<Props, 'appId'>) {
  return <div className="app-content"><div className="section-title"><span>LuxOS</span><strong>Settings</strong></div><div className="settings-group glass-card"><div className="setting-row"><div><strong>Reduce Motion</strong><small>Use simpler transitions</small></div><button className={`switch ${settings.reduceMotion ? 'on' : ''}`} onClick={() => updateSettings({ ...settings, reduceMotion: !settings.reduceMotion })}><span /></button></div><div className="setting-row"><div><strong>App Labels</strong><small>Show names below icons</small></div><button className={`switch ${settings.showLabels ? 'on' : ''}`} onClick={() => updateSettings({ ...settings, showLabels: !settings.showLabels })}><span /></button></div><div className="setting-row slider-row"><div><strong>Glass Intensity</strong><small>{settings.glassIntensity}%</small></div><input type="range" min="25" max="100" value={settings.glassIntensity} onChange={e => updateSettings({ ...settings, glassIntensity: Number(e.target.value) })} /></div></div><button className="danger-button" onClick={onReset}>Reset LuxOS data</button></div>
}

export function AppContent(props: Props) {
  if (props.appId === 'lux') return <LuxHome />
  if (props.appId === 'gallery') return <Gallery />
  if (props.appId === 'notes') return <Notes />
  if (props.appId === 'projects') return <Projects />
  if (props.appId === 'files') return <Files />
  if (props.appId === 'browser') return <Browser />
  if (props.appId === 'themes') return <Themes settings={props.settings} updateSettings={props.updateSettings} />
  if (props.appId === 'terminal') return <Terminal />
  return <Settings settings={props.settings} updateSettings={props.updateSettings} onReset={props.onReset} />
}
