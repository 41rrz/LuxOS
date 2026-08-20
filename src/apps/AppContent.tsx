import { useEffect, useMemo, useRef, useState } from 'react'
import type { Accent, AppId, LuxSettings } from '../system/types'
import {
  ancestors,
  createFolder,
  createTextFile,
  deleteNode,
  ensureNotesFile,
  getNode,
  importFile,
  listChildren,
  loadVfs,
  nodePath,
  renameNode,
  resolvePath,
  rootId,
  searchVfs,
  updateText,
  type VfsNode,
} from '../system/vfs'

interface Props {
  appId: AppId
  settings: LuxSettings
  updateSettings: (settings: LuxSettings) => void
  openApp: (id: AppId) => void
  onReset: () => void
}

const accents: Accent[] = ['violet', 'blue', 'pink', 'orange', 'green']

function LuxHome({ openApp }: Pick<Props, 'openApp'>) {
  const files = loadVfs().filter(node => node.id !== rootId())
  return (
    <div className="app-page lux-home-page">
      <section className="aero-hero">
        <div>
          <span className="kicker">LUXOS DESKTOP</span>
          <h1>Your browser became a desktop.</h1>
          <p>LuxOS 0.4 adds a persistent virtual filesystem, deeper desktop behavior, Aero Peek and a much more useful shell.</p>
        </div>
        <div className="hero-mark">L</div>
      </section>
      <div className="quick-grid">
        <button onClick={() => openApp('files')}><strong>Computer</strong><small>{files.length} items in LuxOS storage</small></button>
        <button onClick={() => openApp('projects')}><strong>Projects</strong><small>Open your workspace</small></button>
        <button onClick={() => openApp('gallery')}><strong>Gallery</strong><small>Browse imported images</small></button>
      </div>
      <section className="info-panel">
        <div><span>Edition</span><strong>LuxOS Desktop</strong></div>
        <div><span>Version</span><strong>0.4 Filesystem Preview</strong></div>
        <div><span>Runtime</span><strong>Web / GitHub Pages</strong></div>
      </section>
    </div>
  )
}

function FileExplorer() {
  const [nodes, setNodes] = useState(loadVfs)
  const [currentId, setCurrentId] = useState(rootId())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState('')
  const importRef = useRef<HTMLInputElement>(null)

  const refresh = () => setNodes(loadVfs())
  const current = getNode(currentId, nodes) ?? getNode(rootId(), nodes)!
  const selected = selectedId ? getNode(selectedId, nodes) : null
  const crumbs = ancestors(current.id, nodes)
  const visible = query ? searchVfs(query, nodes) : listChildren(current.id, nodes)

  useEffect(() => {
    setEditor(selected?.kind === 'text' ? selected.content || '' : '')
  }, [selectedId, selected?.updatedAt])

  const openNode = (node: VfsNode) => {
    if (node.kind === 'folder') {
      setCurrentId(node.id)
      setSelectedId(null)
      setQuery('')
    } else {
      setSelectedId(node.id)
    }
  }

  const newFolder = () => {
    const name = window.prompt('Folder name', 'New folder')
    if (!name) return
    createFolder(current.id, name)
    refresh()
  }

  const newText = () => {
    const name = window.prompt('Text document name', 'New Text Document.txt')
    if (!name) return
    const node = createTextFile(current.id, name)
    refresh()
    setSelectedId(node.id)
  }

  const rename = () => {
    if (!selected) return
    const name = window.prompt('Rename', selected.name)
    if (!name) return
    renameNode(selected.id, name)
    refresh()
  }

  const remove = () => {
    if (!selected || !window.confirm(`Delete ${selected.name}?`)) return
    deleteNode(selected.id)
    setSelectedId(null)
    refresh()
  }

  const saveEditor = () => {
    if (!selected || selected.kind !== 'text') return
    updateText(selected.id, editor)
    refresh()
  }

  const importSelectedFile = (file?: File) => {
    if (!file) return
    if (file.size > 1_500_000) {
      window.alert('For this browser-storage preview, imports are limited to about 1.5 MB per file.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        importFile(current.id, file, String(reader.result || ''))
        refresh()
      } catch (error) {
        window.alert(error instanceof Error ? error.message : 'The file could not be imported.')
      }
    }
    if (file.type.startsWith('image/')) reader.readAsDataURL(file)
    else reader.readAsText(file)
  }

  return (
    <div className="explorer-shell explorer-v4">
      <aside className="explorer-sidebar">
        <strong>Favorites</strong>
        {['desktop', 'downloads', 'documents'].map(id => {
          const item = getNode(id, nodes)
          return item ? <button key={id} onClick={() => { setCurrentId(id); setSelectedId(null); setQuery('') }}>{item.name}</button> : null
        })}
        <strong>Libraries</strong>
        {['documents', 'pictures', 'projects'].map(id => {
          const item = getNode(id, nodes)
          return item ? <button key={id} onClick={() => { setCurrentId(id); setSelectedId(null); setQuery('') }}>{item.name}</button> : null
        })}
      </aside>
      <section className="explorer-main">
        <div className="explorer-toolbar explorer-toolbar-v4">
          <button onClick={() => current.parentId && setCurrentId(current.parentId)} disabled={!current.parentId}>←</button>
          <button onClick={() => setCurrentId(rootId())}>⌂</button>
          <div className="breadcrumb-bar">{crumbs.map((crumb, index) => <button key={crumb.id} onClick={() => setCurrentId(crumb.id)}>{index === 0 ? 'Computer' : crumb.name}</button>)}</div>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${current.name}`} />
        </div>
        <div className="explorer-commandbar">
          <button onClick={newFolder}>New folder</button>
          <button onClick={newText}>New text file</button>
          <button onClick={() => importRef.current?.click()}>Import file</button>
          <input ref={importRef} type="file" hidden onChange={event => importSelectedFile(event.target.files?.[0])} />
          <span />
          <button disabled={!selected} onClick={rename}>Rename</button>
          <button disabled={!selected} onClick={remove}>Delete</button>
        </div>
        <div className={`explorer-workarea ${selected ? 'with-preview' : ''}`}>
          <div className="file-grid">
            {visible.map(node => <button key={node.id} className={`file-item ${selectedId === node.id ? 'selected' : ''}`} onClick={() => setSelectedId(node.id)} onDoubleClick={() => openNode(node)}>
              <span className={`vfs-icon vfs-${node.kind}`} />
              <strong>{node.name}</strong>
              <small>{node.kind === 'folder' ? `${listChildren(node.id, nodes).length} items` : node.kind === 'image' ? 'Image' : 'Text document'}</small>
            </button>)}
            {visible.length === 0 && <div className="empty-folder"><span>◇</span><strong>{query ? 'No matching files' : 'This folder is empty'}</strong><small>{query ? 'Try another search.' : 'Create a folder or import something into LuxOS.'}</small></div>}
          </div>
          {selected && <aside className="explorer-preview">
            <div className="preview-head"><span className={`vfs-icon vfs-${selected.kind}`} /><div><strong>{selected.name}</strong><small>{nodePath(selected.id, nodes)}</small></div></div>
            {selected.kind === 'image' && selected.content && <img src={selected.content} alt={selected.name} />}
            {selected.kind === 'text' && <><textarea value={editor} onChange={event => setEditor(event.target.value)} /><button className="primary-action" onClick={saveEditor}>Save changes</button></>}
            {selected.kind === 'folder' && <button className="primary-action" onClick={() => openNode(selected)}>Open folder</button>}
          </aside>}
        </div>
        <div className="explorer-status"><span>{visible.length} item{visible.length === 1 ? '' : 's'}</span><span>LuxOS Virtual Disk • persistent browser storage</span></div>
      </section>
    </div>
  )
}

function Gallery() {
  const [nodes, setNodes] = useState(() => loadVfs().filter(node => node.kind === 'image'))
  const inputRef = useRef<HTMLInputElement>(null)
  const addImage = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 1_500_000) { window.alert('Please use an image under 1.5 MB for this preview.'); return }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        importFile('pictures', file, String(reader.result || ''))
        setNodes(loadVfs().filter(node => node.kind === 'image'))
      } catch (error) {
        window.alert(error instanceof Error ? error.message : 'The image could not be imported.')
      }
    }
    reader.readAsDataURL(file)
  }
  return <div className="app-page gallery-v4"><div className="page-heading gallery-heading"><div><span>Pictures Library</span><h2>Gallery</h2></div><button onClick={() => inputRef.current?.click()}>Import picture</button><input ref={inputRef} hidden type="file" accept="image/*" onChange={event => addImage(event.target.files?.[0])} /></div>{nodes.length ? <div className="desktop-gallery imported-gallery">{nodes.map(node => <button className="media-card imported-media" key={node.id} style={{ backgroundImage: `linear-gradient(180deg, transparent, rgba(5,7,15,.78)), url(${node.content})` }}><span>{node.name}</span></button>)}</div> : <div className="gallery-empty"><span>▧</span><h3>Your Pictures library is empty</h3><p>Import artwork or photos and they will live inside LuxOS storage.</p><button onClick={() => inputRef.current?.click()}>Import your first picture</button></div>}</div>
}

function Notes() {
  const [noteId] = useState(() => ensureNotesFile().id)
  const [value, setValue] = useState(() => getNode(noteId)?.content || '')
  useEffect(() => {
    const timer = window.setTimeout(() => updateText(noteId, value), 180)
    return () => window.clearTimeout(timer)
  }, [noteId, value])
  return <div className="notes-shell"><div className="notes-ribbon"><button onClick={() => setValue('')}>New</button><button onClick={() => updateText(noteId, value)}>Save</button><button>Format</button><span>Documents\Notes.txt • saved automatically</span></div><textarea value={value} onChange={event => setValue(event.target.value)} placeholder="Type a note..." /></div>
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
  const [lines, setLines] = useState(['LuxOS Command Shell [Version 0.4.0]', '(c) Lux. All rights reserved.', 'Type HELP for commands.', ''])
  const [command, setCommand] = useState('')
  const [cwdId, setCwdId] = useState(rootId())

  const run = () => {
    const raw = command.trim()
    if (!raw) return
    const [verbRaw, ...args] = raw.split(/\s+/)
    const verb = verbRaw.toLowerCase()
    const argText = raw.slice(verbRaw.length).trim()
    let response = ''

    if (verb === 'clear' || verb === 'cls') { setLines([]); setCommand(''); return }
    if (verb === 'help') response = 'HELP  VER  WHOAMI  DATE  DIR  CD  PWD  TYPE  MKDIR  TOUCH  DEL  ECHO  CLS'
    else if (verb === 'ver') response = 'LuxOS Desktop 0.4.0'
    else if (verb === 'whoami') response = 'lux-user'
    else if (verb === 'date') response = new Date().toString()
    else if (verb === 'pwd') response = nodePath(cwdId)
    else if (verb === 'dir') {
      const target = argText ? resolvePath(argText, cwdId) : getNode(cwdId)
      if (!target || target.kind !== 'folder') response = 'The system cannot find the path specified.'
      else {
        const items = listChildren(target.id)
        response = items.length ? items.map(node => `${node.kind === 'folder' ? '<DIR>     ' : '          '}${node.name}`).join('\n') : 'File Not Found'
      }
    } else if (verb === 'cd') {
      const target = resolvePath(argText || 'C:\\', cwdId)
      if (!target || target.kind !== 'folder') response = 'The system cannot find the path specified.'
      else { setCwdId(target.id); response = '' }
    } else if (verb === 'type') {
      const target = resolvePath(argText, cwdId)
      response = target?.kind === 'text' ? target.content || '' : 'The system cannot find the file specified.'
    } else if (verb === 'mkdir' || verb === 'md') {
      if (!argText) response = 'The syntax of the command is incorrect.'
      else { createFolder(cwdId, argText); response = `Directory created: ${argText}` }
    } else if (verb === 'touch') {
      if (!argText) response = 'The syntax of the command is incorrect.'
      else { createTextFile(cwdId, argText); response = `File created: ${argText}` }
    } else if (verb === 'del') {
      const target = resolvePath(argText, cwdId)
      if (!target || target.kind === 'folder') response = 'The system cannot find the file specified.'
      else { deleteNode(target.id); response = `Deleted ${target.name}` }
    } else if (verb === 'echo') {
      const redirect = argText.match(/^(.*?)\s*>\s*(.+)$/)
      if (redirect) {
        const [, text, filename] = redirect
        const existing = resolvePath(filename, cwdId)
        if (existing?.kind === 'text') updateText(existing.id, text)
        else createTextFile(cwdId, filename, text)
        response = ''
      } else response = args.join(' ')
    } else response = `'${raw}' is not recognized as an internal command.`

    const prompt = `${nodePath(cwdId)}>${raw}`
    setLines(current => [...current, prompt, ...(response ? response.split('\n') : []), ''])
    setCommand('')
  }
  return <div className="cmd-shell"><div>{lines.map((line, index) => <p key={`${index}-${line}`}>{line || '\u00a0'}</p>)}</div><label><span>{nodePath(cwdId)}&gt;</span><input autoFocus value={command} onChange={event => setCommand(event.target.value)} onKeyDown={event => event.key === 'Enter' && run()} /></label></div>
}

function Themes({ settings, updateSettings }: Pick<Props, 'settings' | 'updateSettings'>) {
  const [status, setStatus] = useState('')
  const uploadRef = useRef<HTMLInputElement>(null)
  const wallpapers: Array<{ id: Exclude<LuxSettings['wallpaper'], 'custom'>; name: string; description: string }> = [
    { id: 'aurora', name: 'Lux Aurora', description: 'Violet glass and drifting light' },
    { id: 'midnight', name: 'Midnight', description: 'Deep blue desktop with cool highlights' },
    { id: 'sunset', name: 'Afterglow', description: 'Purple, rose and warm horizon light' },
  ]

  const uploadWallpaper = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 1_500_000) { setStatus('Use an image under 1.5 MB for browser storage.'); return }
    const reader = new FileReader()
    reader.onload = () => {
      updateSettings({ ...settings, wallpaper: 'custom', customWallpaper: String(reader.result || '') })
      setStatus('Custom wallpaper applied.')
    }
    reader.readAsDataURL(file)
  }

  return <div className="app-page personalize-page">
    <div className="page-heading"><span>Personalization</span><h2>Make LuxOS yours</h2></div>
    <div className="wallpaper-picker">
      {wallpapers.map(wallpaper => <button key={wallpaper.id} className={`wallpaper-choice wallpaper-choice-${wallpaper.id} ${settings.wallpaper === wallpaper.id ? 'active' : ''}`} onClick={() => updateSettings({ ...settings, wallpaper: wallpaper.id })}><span className="wallpaper-preview" /><strong>{wallpaper.name}</strong><small>{wallpaper.description}</small></button>)}
      <button className={`wallpaper-choice wallpaper-choice-custom ${settings.wallpaper === 'custom' ? 'active' : ''}`} onClick={() => uploadRef.current?.click()}><span className="wallpaper-preview" style={settings.customWallpaper ? { backgroundImage: `url(${settings.customWallpaper})` } : undefined} /><strong>My wallpaper</strong><small>Choose an image from your computer</small></button>
      <input ref={uploadRef} hidden type="file" accept="image/*" onChange={event => uploadWallpaper(event.target.files?.[0])} />
    </div>
    {status && <div className="personalize-status">{status}</div>}
    <h3 className="personalize-label">Window color</h3>
    <div className="accent-picker">{accents.map(accent => <button key={accent} className={`accent-${accent} ${settings.accent === accent ? 'active' : ''}`} onClick={() => updateSettings({ ...settings, accent })}><span /><strong>{accent}</strong></button>)}</div>
  </div>
}

function Settings({ settings, updateSettings, onReset, openApp }: Pick<Props, 'settings' | 'updateSettings' | 'onReset' | 'openApp'>) {
  const nodes = loadVfs()
  return <div className="control-panel-page">
    <div className="control-panel-head"><span className="control-panel-mark">L</span><div><h2>Control Panel</h2><p>Adjust the way LuxOS looks, sounds and behaves.</p></div></div>
    <div className="setting-categories">
      <button onClick={() => openApp('themes')}><span>◈</span><div><strong>Appearance and Personalization</strong><small>Wallpaper, colors, glass and desktop visuals</small></div></button>
      <button onClick={() => openApp('files')}><span>▤</span><div><strong>Storage</strong><small>{nodes.length - 1} items stored in the LuxOS virtual disk</small></div></button>
      <section><div><strong>Glass intensity</strong><small>{settings.glassIntensity}%</small></div><input type="range" min="35" max="100" value={settings.glassIntensity} onChange={event => updateSettings({ ...settings, glassIntensity: Number(event.target.value) })} /></section>
      <section><div><strong>System sounds</strong><small>Play LuxOS interface and session sounds</small></div><button className={`toggle ${settings.systemSounds ? 'on' : ''}`} onClick={() => updateSettings({ ...settings, systemSounds: !settings.systemSounds })}><i /></button></section>
      <section><div><strong>Master volume</strong><small>{settings.masterVolume}%</small></div><input type="range" min="0" max="100" value={settings.masterVolume} onChange={event => updateSettings({ ...settings, masterVolume: Number(event.target.value) })} /></section>
      <section><div><strong>Reduce motion</strong><small>Use simpler desktop animations</small></div><button className={`toggle ${settings.reduceMotion ? 'on' : ''}`} onClick={() => updateSettings({ ...settings, reduceMotion: !settings.reduceMotion })}><i /></button></section>
      <section><div><strong>Desktop icon labels</strong><small>Show names beneath desktop icons</small></div><button className={`toggle ${settings.showDesktopLabels ? 'on' : ''}`} onClick={() => updateSettings({ ...settings, showDesktopLabels: !settings.showDesktopLabels })}><i /></button></section>
    </div>
    <button className="reset-button" onClick={onReset}>Reset LuxOS local settings</button>
  </div>
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
