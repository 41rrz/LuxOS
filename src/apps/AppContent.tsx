import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { Accent, AppId, ClipboardState, LaunchData, LuxSettings } from '../system/types'
import { getAsset, subscribeAssets } from '../system/assetStore'
import {
  ancestors,
  copyNodes,
  createFolder,
  createImageFile,
  createTextFile,
  deletePermanently,
  desktopId,
  emptyRecycleBin,
  ensureNotesFile,
  getNode,
  importFile,
  listChildren,
  loadVfs,
  moveNodes,
  nodePath,
  recycleId,
  recycleNodes,
  renameNode,
  resolvePath,
  restoreNodes,
  rootId,
  searchVfs,
  storageStats,
  subscribeVfs,
  updateText,
  type VfsNode,
} from '../system/vfs'

interface Props {
  appId: AppId
  launch?: LaunchData
  settings: LuxSettings
  updateSettings: (settings: LuxSettings) => void
  openApp: (id: AppId, launch?: LaunchData) => void
  openNode: (node: VfsNode) => void
  onReset: () => void
  clipboard: ClipboardState | null
  setClipboard: (value: ClipboardState | null) => void
  pushNotification: (message: string, title?: string) => void
}

const accents: Accent[] = ['violet', 'blue', 'pink', 'orange', 'green']

function useVfsNodes() {
  const [nodes, setNodes] = useState(loadVfs)
  useEffect(() => subscribeVfs(() => setNodes(loadVfs())), [])
  return [nodes, () => setNodes(loadVfs())] as const
}

function readImportedFile(file: File, onReady: (content: string) => void) {
  const reader = new FileReader()
  reader.onload = () => onReady(String(reader.result || ''))
  if (file.type.startsWith('image/') || file.type.startsWith('audio/')) reader.readAsDataURL(file)
  else reader.readAsText(file)
}

async function prepareWallpaper(source: string) {
  if (!source || source.length <= 1_200_000) return source
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('LuxOS could not read that wallpaper image.'))
    image.src = source
  })

  const render = (maxWidth: number, maxHeight: number, quality: number) => {
    const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight)
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('LuxOS could not prepare that wallpaper.')
    context.drawImage(image, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', quality)
  }

  for (const [width, height, quality] of [[1920, 1080, .82], [1600, 1000, .74], [1280, 800, .68]] as const) {
    const encoded = render(width, height, quality)
    if (encoded.length <= 1_450_000) return encoded
  }
  return render(1024, 640, .6)
}


function useAssetContent(node?: VfsNode | null) {
  const [content, setContent] = useState(node?.content || '')
  useEffect(() => {
    let active = true
    const load = () => {
      if (!node) { setContent(''); return }
      if (node.content) { setContent(node.content); return }
      if (!node.assetKey) { setContent(''); return }
      void getAsset(node.assetKey).then(value => { if (active) setContent(value || '') }).catch(() => { if (active) setContent('') })
    }
    load()
    const unsubscribe = subscribeAssets(key => { if (!key || key === node?.assetKey) load() })
    return () => { active = false; unsubscribe() }
  }, [node?.id, node?.content, node?.assetKey])
  return content
}

function AssetImage({ node, alt, className }: { node: VfsNode; alt?: string; className?: string }) {
  const src = useAssetContent(node)
  return src ? <img className={className} src={src} alt={alt || node.name} /> : <div className="asset-loading">Loading image…</div>
}

function AssetAudio({ node }: { node: VfsNode }) {
  const src = useAssetContent(node)
  return src ? <audio controls src={src} /> : <div className="asset-loading">Loading audio…</div>
}

function GalleryCard({ node, openNode }: { node: VfsNode; openNode: (node: VfsNode) => void }) {
  const src = useAssetContent(node)
  return <button onDoubleClick={() => openNode(node)} onClick={() => openNode(node)} className="media-card imported-media" style={src ? { backgroundImage: `linear-gradient(180deg,transparent,rgba(5,7,15,.76)),url(${src})` } : undefined}><span>{node.name}</span></button>
}

function LuxHome({ openApp }: Pick<Props, 'openApp'>) {
  const [nodes] = useVfsNodes()
  const stats = storageStats(nodes)
  return <div className="app-page lux-home-page mega-home">
    <section className="aero-hero mega-hero"><div><span className="kicker">LUXOS DESKTOP • MEGA UPDATE</span><h1>A desktop that actually shares its files.</h1><p>Desktop, Explorer, Notes, Gallery, Photo Viewer, Paint, Media Player and Terminal now work around one persistent LuxOS virtual disk.</p></div><div className="hero-mark">L</div></section>
    <div className="quick-grid four"><button onClick={() => openApp('files')}><strong>Computer</strong><small>{stats.items} active items</small></button><button onClick={() => openApp('recycle')}><strong>Recycle Bin</strong><small>{stats.recycle} deleted items</small></button><button onClick={() => openApp('gallery')}><strong>Gallery</strong><small>Pictures & artwork</small></button><button onClick={() => openApp('terminal')}><strong>Terminal</strong><small>Control the same disk</small></button></div>
    <section className="info-panel"><div><span>Edition</span><strong>LuxOS Desktop Mega</strong></div><div><span>Version</span><strong>1.0 Preview</strong></div><div><span>Storage</span><strong>{Math.max(1, Math.round(stats.bytes / 1024))} KB metadata + media store</strong></div></section>
  </div>
}

function FileExplorer({ launch, openNode, clipboard, setClipboard, pushNotification, recycleMode = false }: Pick<Props, 'launch' | 'openNode' | 'clipboard' | 'setClipboard' | 'pushNotification'> & { recycleMode?: boolean }) {
  const [nodes, refresh] = useVfsNodes()
  const initialId = recycleMode ? recycleId() : launch?.folderId || rootId()
  const [currentId, setCurrentId] = useState(initialId)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState('')
  const [history, setHistory] = useState<string[]>([initialId])
  const [historyIndex, setHistoryIndex] = useState(0)
  const importRef = useRef<HTMLInputElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)

  const current = getNode(currentId, nodes) ?? getNode(rootId(), nodes)!
  const selected = selectedIds.length === 1 ? getNode(selectedIds[0], nodes) : null
  const crumbs = ancestors(current.id, nodes)
  const visible = query ? searchVfs(query, nodes) : listChildren(current.id, nodes)

  useEffect(() => setEditor(selected?.kind === 'text' ? selected.content || '' : ''), [selected?.id, selected?.updatedAt])
  useEffect(() => { shellRef.current?.focus() }, [])

  const navigate = (folderId: string, replaceHistory = false) => {
    const target = getNode(folderId, nodes)
    if (!target || target.kind !== 'folder') return
    setCurrentId(folderId); setSelectedIds([]); setQuery('')
    if (!replaceHistory) {
      const next = history.slice(0, historyIndex + 1).concat(folderId)
      setHistory(next); setHistoryIndex(next.length - 1)
    }
  }

  const createFolderHere = () => {
    if (recycleMode) return
    const name = window.prompt('Folder name', 'New folder')
    if (name) { const node = createFolder(current.id, name); refresh(); setSelectedIds([node.id]) }
  }
  const createTextHere = () => {
    if (recycleMode) return
    const name = window.prompt('Text document name', 'New Text Document.txt')
    if (name) { const node = createTextFile(current.id, name); refresh(); setSelectedIds([node.id]) }
  }
  const renameSelected = () => {
    if (!selected || selected.system || recycleMode) return
    const name = window.prompt('Rename', selected.name)
    if (name) { renameNode(selected.id, name); refresh() }
  }
  const deleteSelected = () => {
    if (!selectedIds.length) return
    if (recycleMode) {
      if (window.confirm(`Permanently delete ${selectedIds.length} item(s)?`)) deletePermanently(selectedIds)
    } else recycleNodes(selectedIds)
    setSelectedIds([]); refresh(); pushNotification(recycleMode ? 'Items permanently deleted.' : 'Items moved to Recycle Bin.', 'File Explorer')
  }
  const copySelected = (mode: 'copy' | 'cut') => selectedIds.length && setClipboard({ mode, nodeIds: selectedIds })
  const paste = () => {
    if (!clipboard || recycleMode) return
    try {
      if (clipboard.mode === 'copy') copyNodes(clipboard.nodeIds, current.id)
      else { moveNodes(clipboard.nodeIds, current.id); setClipboard(null) }
      refresh(); pushNotification(`${clipboard.nodeIds.length} item(s) pasted.`, 'File Explorer')
    } catch (error) { window.alert(error instanceof Error ? error.message : 'Paste failed.') }
  }
  const restore = () => { if (selectedIds.length) { restoreNodes(selectedIds); setSelectedIds([]); refresh(); pushNotification('Item(s) restored from Recycle Bin.') } }
  const saveEditor = () => { if (selected?.kind === 'text') { updateText(selected.id, editor); refresh() } }

  const importFiles = (files: FileList | File[]) => {
    if (recycleMode) return
    Array.from(files).forEach(file => {
      const maxSize = file.type.startsWith('image/') || file.type.startsWith('audio/') ? 20_000_000 : 2_000_000
      if (file.size > maxSize) { window.alert(`${file.name} is too large for this LuxOS browser-storage build.`); return }
      readImportedFile(file, content => { try { importFile(current.id, file, content); refresh(); pushNotification(`${file.name} imported.`, 'File Explorer') } catch (error) { window.alert(error instanceof Error ? error.message : 'Import failed.') } })
    })
  }

  const keyDown = (event: ReactKeyboardEvent) => {
    if (event.ctrlKey && event.key.toLowerCase() === 'a') { event.preventDefault(); setSelectedIds(visible.map(node => node.id)) }
    if (event.ctrlKey && event.key.toLowerCase() === 'c') { event.preventDefault(); copySelected('copy') }
    if (event.ctrlKey && event.key.toLowerCase() === 'x') { event.preventDefault(); copySelected('cut') }
    if (event.ctrlKey && event.key.toLowerCase() === 'v') { event.preventDefault(); paste() }
    if (event.key === 'Delete') { event.preventDefault(); deleteSelected() }
    if (event.key === 'F2') { event.preventDefault(); renameSelected() }
    if (event.key === 'Enter' && selected) openNode(selected)
  }

  return <div ref={shellRef} tabIndex={0} onKeyDown={keyDown} className="explorer-shell explorer-mega">
    <aside className="explorer-sidebar">{recycleMode?<><strong>Recycle Bin</strong><button onClick={()=>navigate(recycleId())}>Deleted items</button><small className="sidebar-note">Restore items or permanently remove them.</small></>:<><strong>Favorites</strong>{['desktop','downloads','documents'].map(id => { const item = getNode(id,nodes); return item ? <button key={id} onClick={() => navigate(id)}>{item.name}</button> : null })}<strong>Libraries</strong>{['documents','pictures','music','projects'].map(id => { const item = getNode(id,nodes); return item ? <button key={id} onClick={() => navigate(id)}>{item.name}</button> : null })}<strong>System</strong><button onClick={() => navigate(rootId())}>Computer</button><button onClick={() => navigate(recycleId())}>Recycle Bin</button></>}</aside>
    <section className="explorer-main">
      <div className="explorer-toolbar explorer-toolbar-v4"><button disabled={historyIndex <= 0} onClick={() => { const i=historyIndex-1; setHistoryIndex(i); setCurrentId(history[i]); setSelectedIds([]) }}>←</button><button disabled={historyIndex >= history.length-1} onClick={() => { const i=historyIndex+1; setHistoryIndex(i); setCurrentId(history[i]); setSelectedIds([]) }}>→</button><button onClick={() => navigate(rootId())}>⌂</button><div className="breadcrumb-bar">{crumbs.map((crumb,index) => <button key={crumb.id} onClick={() => navigate(crumb.id)}>{index===0?'Computer':crumb.name}</button>)}</div><input value={query} onChange={event=>setQuery(event.target.value)} placeholder={`Search ${current.name}`} /></div>
      <div className="explorer-commandbar">{current.id === recycleId() ? <><button disabled={!selectedIds.length} onClick={restore}>Restore</button><button disabled={!selectedIds.length} onClick={deleteSelected}>Delete permanently</button><button onClick={() => { if (window.confirm('Empty Recycle Bin?')) { emptyRecycleBin(); setSelectedIds([]); refresh() } }}>Empty Recycle Bin</button></> : <><button onClick={createFolderHere}>New folder</button><button onClick={createTextHere}>New text file</button><button onClick={() => importRef.current?.click()}>Import</button><input ref={importRef} type="file" multiple hidden onChange={event => event.target.files && importFiles(event.target.files)} /><span className="command-separator"/><button disabled={!selectedIds.length} onClick={() => copySelected('copy')}>Copy</button><button disabled={!selectedIds.length} onClick={() => copySelected('cut')}>Cut</button><button disabled={!clipboard} onClick={paste}>Paste</button><button disabled={selectedIds.length!==1 || Boolean(selected?.system)} onClick={renameSelected}>Rename</button><button disabled={!selectedIds.length} onClick={deleteSelected}>Delete</button></>}</div>
      <div className={`explorer-workarea ${selected ? 'with-preview' : ''}`} onDragOver={event=>event.preventDefault()} onDrop={event => { event.preventDefault(); if (event.dataTransfer.files.length) importFiles(event.dataTransfer.files); const raw=event.dataTransfer.getData('application/x-lux-vfs'); if(raw && current.id !== recycleId()) { try { moveNodes(JSON.parse(raw) as string[], current.id); refresh() } catch {} } }}>
        <div className="file-grid">{visible.map(node => <button key={node.id} draggable={!node.system && current.id !== recycleId()} onDragStart={event => event.dataTransfer.setData('application/x-lux-vfs', JSON.stringify(selectedIds.includes(node.id)?selectedIds:[node.id]))} onDragOver={event=>{if(node.kind==='folder'){event.preventDefault();event.stopPropagation()}}} onDrop={event=>{if(node.kind!=='folder')return;event.preventDefault();event.stopPropagation();const raw=event.dataTransfer.getData('application/x-lux-vfs');if(raw){try{moveNodes(JSON.parse(raw) as string[],node.id);refresh()}catch{}}}} className={`file-item ${selectedIds.includes(node.id)?'selected':''}`} onClick={event => setSelectedIds(currentSelection => event.ctrlKey ? currentSelection.includes(node.id) ? currentSelection.filter(id=>id!==node.id) : [...currentSelection,node.id] : [node.id])} onDoubleClick={() => openNode(node)}><span className={`vfs-icon vfs-${node.kind}`} /><strong>{node.name}</strong><small>{node.kind==='folder'?`${listChildren(node.id,nodes).length} items`:node.kind==='image'?'Image':node.kind==='audio'?'Audio':'Text document'}</small></button>)}{visible.length===0&&<div className="empty-folder"><span>{current.id===recycleId()?'♲':'◇'}</span><strong>{query?'No matching files':current.id===recycleId()?'Recycle Bin is empty':'This folder is empty'}</strong><small>{query?'Try another search.':'Drop files here or create something new.'}</small></div>}</div>
        {selected && <aside className="explorer-preview"><div className="preview-head"><span className={`vfs-icon vfs-${selected.kind}`} /><div><strong>{selected.name}</strong><small>{nodePath(selected.id,nodes)}</small></div></div>{selected.kind==='image'&&<AssetImage node={selected} alt={selected.name}/>} {selected.kind==='audio'&&<AssetAudio node={selected}/>} {selected.kind==='text'&&<><textarea value={editor} onChange={event=>setEditor(event.target.value)}/><button className="primary-action" onClick={saveEditor}>Save changes</button></>} {selected.kind==='folder'&&<button className="primary-action" onClick={()=>navigate(selected.id)}>Open folder</button>}<div className="file-properties"><span>Type</span><strong>{selected.kind}</strong><span>Modified</span><strong>{new Date(selected.updatedAt).toLocaleString()}</strong></div></aside>}
      </div>
      <div className="explorer-status"><span>{visible.length} item{visible.length===1?'':'s'} • {selectedIds.length} selected</span><span>{clipboard ? `${clipboard.nodeIds.length} item(s) ${clipboard.mode==='cut'?'cut':'copied'}` : 'LuxOS Virtual Disk'}</span></div>
    </section>
  </div>
}

function Gallery({ openNode }: Pick<Props,'openNode'>) {
  const [nodes, refresh] = useVfsNodes(); const inputRef=useRef<HTMLInputElement>(null)
  const images=nodes.filter(node=>node.kind==='image'&&node.parentId!==recycleId())
  const add=(files?:FileList|null)=>files&&Array.from(files).forEach(file=>{ if(!file.type.startsWith('image/'))return; if(file.size>20_000_000){window.alert(`${file.name} is over the 20 MB media limit.`);return} readImportedFile(file,content=>{importFile('pictures',file,content);refresh()}) })
  return <div className="app-page gallery-v4"><div className="page-heading gallery-heading"><div><span>Pictures Library</span><h2>Gallery</h2></div><button onClick={()=>inputRef.current?.click()}>Import pictures</button><input ref={inputRef} hidden multiple type="file" accept="image/*" onChange={event=>add(event.target.files)}/></div>{images.length?<div className="desktop-gallery imported-gallery">{images.map(node=><GalleryCard key={node.id} node={node} openNode={openNode}/>)}</div>:<div className="gallery-empty"><span>▧</span><h3>Your Pictures library is empty</h3><p>Import artwork or photos and they become real LuxOS files.</p><button onClick={()=>inputRef.current?.click()}>Import your first picture</button></div>}</div>
}

function Notes({ launch, pushNotification }: Pick<Props,'launch'|'pushNotification'>) {
  const nodeCandidate=launch?.nodeId ? getNode(launch.nodeId) : null
  const [nodeId]=useState(()=>nodeCandidate?.kind==='text'?nodeCandidate.id:ensureNotesFile().id)
  const [value,setValue]=useState(()=>getNode(nodeId)?.content||'')
  const node=getNode(nodeId)
  useEffect(()=>{const timer=window.setTimeout(()=>updateText(nodeId,value),180);return()=>window.clearTimeout(timer)},[nodeId,value])
  return <div className="notes-shell"><div className="notes-ribbon"><button onClick={()=>setValue('')}>Clear</button><button onClick={()=>{updateText(nodeId,value);pushNotification(`${node?.name||'Document'} saved.`,'Notes')}}>Save</button><span>{nodePath(nodeId)} • saved automatically</span></div><textarea value={value} onChange={event=>setValue(event.target.value)} placeholder="Type a note..." /></div>
}

function ImageViewer({ launch, settings, updateSettings, pushNotification }: Pick<Props,'launch'|'settings'|'updateSettings'|'pushNotification'>) {
  const [nodes]=useVfsNodes(); const images=nodes.filter(node=>node.kind==='image'&&node.parentId!==recycleId()); const initial=launch?.nodeId; const [nodeId,setNodeId]=useState(initial||images[0]?.id||''); const [zoom,setZoom]=useState(1); const [rotation,setRotation]=useState(0); const node=getNode(nodeId,nodes); const src=useAssetContent(node?.kind==='image'?node:null); const index=images.findIndex(item=>item.id===nodeId)
  const go=(delta:number)=>{if(!images.length)return;setNodeId(images[(index+delta+images.length)%images.length].id);setZoom(1);setRotation(0)}
  if(!node||node.kind!=='image')return <div className="viewer-empty">No image selected.</div>
  return <div className="photo-viewer"><div className="photo-stage">{src?<img src={src} alt={node.name} style={{transform:`scale(${zoom}) rotate(${rotation}deg)`}} />:<div className="asset-loading dark">Loading image…</div>}</div><div className="photo-toolbar"><button onClick={()=>go(-1)}>←</button><button onClick={()=>go(1)}>→</button><span /><button onClick={()=>setZoom(v=>Math.max(.25,v-.15))}>−</button><strong>{Math.round(zoom*100)}%</strong><button onClick={()=>setZoom(v=>Math.min(4,v+.15))}>+</button><button onClick={()=>setRotation(v=>v-90)}>↺</button><button onClick={()=>setRotation(v=>v+90)}>↻</button><span/><button onClick={async()=>{if(!src)return;try{const wallpaper=await prepareWallpaper(src);updateSettings({...settings,wallpaper:'custom',customWallpaper:wallpaper});pushNotification(`${node.name} set as wallpaper.`,'Photo Viewer')}catch(error){window.alert(error instanceof Error?error.message:'Wallpaper could not be applied.')}}}>Set as wallpaper</button><button onClick={()=>{recycleNodes([node.id]);pushNotification(`${node.name} moved to Recycle Bin.`,'Photo Viewer')}}>Delete</button></div><div className="photo-caption"><strong>{node.name}</strong><small>{nodePath(node.id,nodes)}</small></div></div>
}

function Projects() {
  const projects=[['LuxOS','Mega Update','Browser desktop environment'],['LuxWorkflow','Active','Warehouse workflow app'],['Lux Scan Bridge','Concept','Desktop utilities'],['VR Projects','Prototype','Roblox & PCVR experiments']]
  return <div className="app-page"><div className="page-heading"><span>Workspace</span><h2>Projects</h2></div><div className="project-list">{projects.map(([name,state,description])=><button key={name}><span className="project-orb"/><div><strong>{name}</strong><small>{description}</small></div><em>{state}</em></button>)}</div></div>
}

function Browser() {
  const [query,setQuery]=useState(''); const [history,setHistory]=useState<string[]>([])
  const target=useMemo(()=>{const value=query.trim();if(!value)return'';return /^https?:\/\//i.test(value)?value:`https://www.google.com/search?q=${encodeURIComponent(value)}`},[query])
  const open=()=>{if(!target)return;setHistory(current=>[query,...current.filter(item=>item!==query)].slice(0,6));window.open(target,'_blank','noopener,noreferrer')}
  return <div className="browser-shell"><div className="browser-chrome"><button>←</button><button>→</button><button>↻</button><input value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>event.key==='Enter'&&open()} placeholder="Search or enter address"/><button onClick={open}>Go</button></div><div className="browser-start"><span className="browser-logo">L</span><h1>Lux Browser</h1><p>Search the web from LuxOS. External pages open securely in a browser tab.</p><div className="browser-search"><input value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>event.key==='Enter'&&open()} placeholder="Search the web"/><button onClick={open}>Search</button></div>{history.length>0&&<div className="browser-history">{history.map(item=><button key={item} onClick={()=>setQuery(item)}>{item}</button>)}</div>}</div></div>
}

function Terminal({ openNode }: Pick<Props,'openNode'>) {
  const [lines,setLines]=useState(['LuxOS Command Shell [Version 1.0.0 Mega]','(c) Lux. All rights reserved.','Type HELP for commands.','']); const [command,setCommand]=useState(''); const [cwdId,setCwdId]=useState(rootId())
  const run=()=>{const raw=command.trim();if(!raw)return;const [verbRaw,...args]=raw.split(/\s+/);const verb=verbRaw.toLowerCase();const argText=raw.slice(verbRaw.length).trim();let response='';let promptCwd=cwdId
    if(verb==='clear'||verb==='cls'){setLines([]);setCommand('');return}
    if(verb==='help')response='HELP VER WHOAMI DATE DIR TREE CD PWD TYPE MKDIR TOUCH DEL RD REN COPY MOVE OPEN START ECHO RECYCLE EMPTYBIN CLS'
    else if(verb==='ver')response='LuxOS Desktop 1.0 Mega Preview'
    else if(verb==='whoami')response='lux-user'
    else if(verb==='date')response=new Date().toString()
    else if(verb==='pwd')response=nodePath(cwdId)
    else if(verb==='dir'||verb==='tree'){const target=argText?resolvePath(argText,cwdId):getNode(cwdId);if(!target||target.kind!=='folder')response='The system cannot find the path specified.';else{const items=listChildren(target.id);response=items.length?items.map(node=>`${node.kind==='folder'?'<DIR>     ':node.kind==='image'?'<IMAGE>   ':node.kind==='audio'?'<AUDIO>   ':'          '}${node.name}`).join('\n'):'File Not Found'}}
    else if(verb==='cd'){const target=resolvePath(argText||'C:\\',cwdId);if(!target||target.kind!=='folder')response='The system cannot find the path specified.';else{setCwdId(target.id);promptCwd=target.id}}
    else if(verb==='type'){const target=resolvePath(argText,cwdId);response=target?.kind==='text'?target.content||'':'The system cannot find the text file specified.'}
    else if(verb==='mkdir'||verb==='md'){if(!argText)response='The syntax of the command is incorrect.';else{createFolder(cwdId,argText);response=`Directory created: ${argText}`}}
    else if(verb==='touch'){if(!argText)response='The syntax of the command is incorrect.';else{createTextFile(cwdId,argText);response=`File created: ${argText}`}}
    else if(verb==='del'||verb==='rd'){const target=resolvePath(argText,cwdId);if(!target||target.system)response='The system cannot find the file specified.';else{recycleNodes([target.id]);response=`Moved ${target.name} to Recycle Bin`}}
    else if(verb==='ren'){const split=argText.match(/^"?([^" ]+)"?\s+"?(.+?)"?$/);const target=split?resolvePath(split[1],cwdId):null;if(!split||!target)response='Usage: REN oldname newname';else{renameNode(target.id,split[2]);response=''}}
    else if(verb==='copy'||verb==='move'){const split=argText.match(/^"?([^" ]+)"?\s+"?(.+?)"?$/);const source=split?resolvePath(split[1],cwdId):null;const target=split?resolvePath(split[2],cwdId):null;if(!source||!target||target.kind!=='folder')response=`Usage: ${verb.toUpperCase()} source destination`;else{verb==='copy'?copyNodes([source.id],target.id):moveNodes([source.id],target.id);response=`${verb==='copy'?'Copied':'Moved'} ${source.name}`}}
    else if(verb==='open'||verb==='start'){const target=resolvePath(argText,cwdId);if(!target)response='The system cannot find the path specified.';else{openNode(target);response=`Opening ${target.name}...`}}
    else if(verb==='recycle'){response=listChildren(recycleId()).map(node=>node.name).join('\n')||'Recycle Bin is empty.'}
    else if(verb==='emptybin'){emptyRecycleBin();response='Recycle Bin emptied.'}
    else if(verb==='echo'){const redirect=argText.match(/^(.*?)\s*>\s*(.+)$/);if(redirect){const[,text,filename]=redirect;const existing=resolvePath(filename,cwdId);if(existing?.kind==='text')updateText(existing.id,text);else createTextFile(cwdId,filename,text)}else response=args.join(' ')}
    else response=`'${raw}' is not recognized as an internal command.`
    const prompt=`${nodePath(promptCwd)}>${raw}`;setLines(current=>[...current,prompt,...(response?response.split('\n'):[]),'']);setCommand('')
  }
  return <div className="cmd-shell"><div>{lines.map((line,index)=><p key={`${index}-${line}`}>{line||'\u00a0'}</p>)}</div><label><span>{nodePath(cwdId)}&gt;</span><input autoFocus value={command} onChange={event=>setCommand(event.target.value)} onKeyDown={event=>event.key==='Enter'&&run()}/></label></div>
}

function Calculator() {
  const [display,setDisplay]=useState('0'); const [memory,setMemory]=useState('')
  const append=(value:string)=>setDisplay(current=>current==='0'?value:current+value); const clear=()=>setDisplay('0'); const solve=()=>{try{if(!/^[0-9+\-*/().%\s]+$/.test(display))throw new Error();const result=Function(`"use strict";return (${display.replace(/%/g,'/100')})`)() as number;setDisplay(Number.isFinite(result)?String(result):'Error')}catch{setDisplay('Error')}}
  const keys=['7','8','9','/','4','5','6','*','1','2','3','-','0','.','(',')','%','+']
  return <div className="calculator"><div className="calc-memory">{memory||' '}</div><div className="calc-display">{display}</div><div className="calc-grid"><button onClick={clear}>C</button><button onClick={()=>setDisplay(current=>current.slice(0,-1)||'0')}>⌫</button><button onClick={()=>{setMemory(display);clear()}}>M</button><button onClick={()=>memory&&append(memory)}>MR</button>{keys.map(key=><button key={key} onClick={()=>append(key)}>{key}</button>)}<button className="calc-equals" onClick={solve}>=</button></div></div>
}

function Paint({ pushNotification }: Pick<Props,'pushNotification'>) {
  const canvasRef=useRef<HTMLCanvasElement>(null); const [size,setSize]=useState(4); const [color,setColor]=useState('#6f4cff'); const drawing=useRef(false)
  useEffect(()=>{const canvas=canvasRef.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height)},[])
  const point=(event:ReactPointerEvent<HTMLCanvasElement>)=>{const canvas=canvasRef.current;if(!canvas)return null;const rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height}}
  const down=(event:ReactPointerEvent<HTMLCanvasElement>)=>{drawing.current=true;const p=point(event);const ctx=canvasRef.current?.getContext('2d');if(p&&ctx){ctx.beginPath();ctx.moveTo(p.x,p.y);canvasRef.current?.setPointerCapture(event.pointerId)}}
  const move=(event:ReactPointerEvent<HTMLCanvasElement>)=>{if(!drawing.current)return;const p=point(event);const ctx=canvasRef.current?.getContext('2d');if(p&&ctx){ctx.strokeStyle=color;ctx.lineWidth=size;ctx.lineCap='round';ctx.lineJoin='round';ctx.lineTo(p.x,p.y);ctx.stroke()}}
  const clear=()=>{const canvas=canvasRef.current;const ctx=canvas?.getContext('2d');if(canvas&&ctx){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height)}}
  const save=()=>{const canvas=canvasRef.current;if(!canvas)return;const name=`Lux Paint ${new Date().toLocaleDateString().replace(/\//g,'-')}.png`;createImageFile('pictures',name,canvas.toDataURL('image/png'));pushNotification(`${name} saved to Pictures.`,'Lux Paint')}
  return <div className="paint-shell"><div className="paint-ribbon"><button onClick={clear}>New</button><button onClick={save}>Save to Pictures</button><label>Color <input type="color" value={color} onChange={event=>setColor(event.target.value)}/></label><label>Brush <input type="range" min="1" max="30" value={size} onChange={event=>setSize(Number(event.target.value))}/><strong>{size}px</strong></label></div><div className="paint-canvas-wrap"><canvas ref={canvasRef} width={1200} height={720} onPointerDown={down} onPointerMove={move} onPointerUp={()=>drawing.current=false} onPointerLeave={()=>drawing.current=false}/></div></div>
}

function MediaPlayer({ launch, pushNotification }: Pick<Props,'launch'|'pushNotification'>) {
  const [nodes,refresh]=useVfsNodes(); const [selectedId,setSelectedId]=useState<string>(launch?.nodeId || ''); const importRef=useRef<HTMLInputElement>(null); const audio=nodes.filter(node=>node.kind==='audio'&&node.parentId!==recycleId()); const selected=getNode(selectedId,nodes)??audio[0]??null; const selectedSrc=useAssetContent(selected?.kind==='audio'?selected:null)
  const add=(file?:File)=>{if(!file||!file.type.startsWith('audio/'))return;if(file.size>20_000_000){window.alert('Use an audio file under 20 MB for this browser-storage build.');return}readImportedFile(file,content=>{const node=importFile('music',file,content);setSelectedId(node.id);refresh();pushNotification(`${file.name} added to Music.`,'Media Player')})}
  return <div className="media-player"><aside><div className="media-title">Music library</div>{audio.map(node=><button className={selected?.id===node.id?'active':''} key={node.id} onClick={()=>setSelectedId(node.id)}><span>♪</span><div><strong>{node.name}</strong><small>LuxOS Music</small></div></button>)}<button className="media-import" onClick={()=>importRef.current?.click()}>+ Import audio</button><input ref={importRef} hidden type="file" accept="audio/*" onChange={event=>add(event.target.files?.[0])}/></aside><section>{selected&&selectedSrc?<><div className="album-art"><span>♪</span></div><h2>{selected.name}</h2><p>Stored in {nodePath(selected.id,nodes)}</p><audio controls autoPlay={false} src={selectedSrc}/></>:<div className="media-empty"><span>♪</span><h2>No music yet</h2><p>Import an audio file into LuxOS.</p></div>}</section></div>
}

function Themes({settings,updateSettings}:Pick<Props,'settings'|'updateSettings'>){const[status,setStatus]=useState('');const uploadRef=useRef<HTMLInputElement>(null);const wallpapers:Array<{id:Exclude<LuxSettings['wallpaper'],'custom'>;name:string;description:string}>=[{id:'aurora',name:'Lux Aurora',description:'Violet glass and drifting light'},{id:'midnight',name:'Midnight',description:'Deep blue desktop with cool highlights'},{id:'sunset',name:'Afterglow',description:'Purple, rose and warm horizon light'}];const upload=(file?:File)=>{if(!file||!file.type.startsWith('image/'))return;if(file.size>20_000_000){setStatus('Use an image under 20 MB.');return}const reader=new FileReader();reader.onload=()=>{void prepareWallpaper(String(reader.result||'')).then(wallpaper=>{updateSettings({...settings,wallpaper:'custom',customWallpaper:wallpaper});setStatus('Custom wallpaper optimized and applied.')}).catch(()=>setStatus('LuxOS could not prepare that image.'))};reader.readAsDataURL(file)};return <div className="app-page personalize-page"><div className="page-heading"><span>Personalization</span><h2>Make LuxOS yours</h2></div><div className="wallpaper-picker">{wallpapers.map(w=><button key={w.id} className={`wallpaper-choice wallpaper-choice-${w.id} ${settings.wallpaper===w.id?'active':''}`} onClick={()=>updateSettings({...settings,wallpaper:w.id})}><span className="wallpaper-preview"/><strong>{w.name}</strong><small>{w.description}</small></button>)}<button className={`wallpaper-choice wallpaper-choice-custom ${settings.wallpaper==='custom'?'active':''}`} onClick={()=>uploadRef.current?.click()}><span className="wallpaper-preview" style={settings.customWallpaper?{backgroundImage:`url(${settings.customWallpaper})`}:undefined}/><strong>My wallpaper</strong><small>Choose an image from your computer</small></button><input ref={uploadRef} hidden type="file" accept="image/*" onChange={event=>upload(event.target.files?.[0])}/></div>{status&&<div className="personalize-status">{status}</div>}<h3 className="personalize-label">Window color</h3><div className="accent-picker">{accents.map(accent=><button key={accent} className={`accent-${accent} ${settings.accent===accent?'active':''}`} onClick={()=>updateSettings({...settings,accent})}><span/><strong>{accent}</strong></button>)}</div></div>}

function Settings({settings,updateSettings,onReset,openApp}:Pick<Props,'settings'|'updateSettings'|'onReset'|'openApp'>){const[nodes]=useVfsNodes();const avatarRef=useRef<HTMLInputElement>(null);const stats=storageStats(nodes);const avatar=(file?:File)=>{if(!file||!file.type.startsWith('image/'))return;if(file.size>1_000_000){window.alert('Use an account picture under 1 MB.');return}const reader=new FileReader();reader.onload=()=>updateSettings({...settings,userAvatar:String(reader.result||'')});reader.readAsDataURL(file)};return <div className="control-panel-page"><div className="control-panel-head"><span className="control-panel-mark">L</span><div><h2>Control Panel</h2><p>Adjust the way LuxOS looks, sounds and behaves.</p></div></div><div className="account-panel"><button className="account-avatar" onClick={()=>avatarRef.current?.click()} style={settings.userAvatar?{backgroundImage:`url(${settings.userAvatar})`}:undefined}>{!settings.userAvatar&&'L'}</button><input ref={avatarRef} hidden type="file" accept="image/*" onChange={event=>avatar(event.target.files?.[0])}/><label><span>Account name</span><input value={settings.userName} maxLength={24} onChange={event=>updateSettings({...settings,userName:event.target.value||'Lux'})}/></label></div><div className="setting-categories"><button onClick={()=>openApp('themes')}><span>◈</span><div><strong>Appearance and Personalization</strong><small>Wallpaper, colors, glass and desktop visuals</small></div></button><button onClick={()=>openApp('files')}><span>▤</span><div><strong>Storage</strong><small>{stats.items} items • {stats.recycle} in Recycle Bin</small></div></button><section><div><strong>Glass intensity</strong><small>{settings.glassIntensity}%</small></div><input type="range" min="35" max="100" value={settings.glassIntensity} onChange={event=>updateSettings({...settings,glassIntensity:Number(event.target.value)})}/></section><section><div><strong>System sounds</strong><small>Play LuxOS interface and session sounds</small></div><button className={`toggle ${settings.systemSounds?'on':''}`} onClick={()=>updateSettings({...settings,systemSounds:!settings.systemSounds})}><i/></button></section><section><div><strong>Master volume</strong><small>{settings.masterVolume}%</small></div><input type="range" min="0" max="100" value={settings.masterVolume} onChange={event=>updateSettings({...settings,masterVolume:Number(event.target.value)})}/></section><section><div><strong>Reduce motion</strong><small>Use simpler desktop animations</small></div><button className={`toggle ${settings.reduceMotion?'on':''}`} onClick={()=>updateSettings({...settings,reduceMotion:!settings.reduceMotion})}><i/></button></section><section><div><strong>Desktop icon labels</strong><small>Show names beneath desktop icons</small></div><button className={`toggle ${settings.showDesktopLabels?'on':''}`} onClick={()=>updateSettings({...settings,showDesktopLabels:!settings.showDesktopLabels})}><i/></button></section><section><div><strong>Clock seconds</strong><small>Show seconds in the taskbar clock</small></div><button className={`toggle ${settings.showSeconds?'on':''}`} onClick={()=>updateSettings({...settings,showSeconds:!settings.showSeconds})}><i/></button></section><section><div><strong>Desktop icon size</strong><small>{settings.desktopIconSize}</small></div><select value={settings.desktopIconSize} onChange={event=>updateSettings({...settings,desktopIconSize:event.target.value as LuxSettings['desktopIconSize']})}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></section></div><button className="reset-button" onClick={onReset}>Reset LuxOS local settings</button></div>}

export function AppContent(props:Props){if(props.appId==='lux')return <LuxHome openApp={props.openApp}/>;if(props.appId==='files')return <FileExplorer launch={props.launch} openNode={props.openNode} clipboard={props.clipboard} setClipboard={props.setClipboard} pushNotification={props.pushNotification}/>;if(props.appId==='recycle')return <FileExplorer launch={{folderId:recycleId()}} openNode={props.openNode} clipboard={props.clipboard} setClipboard={props.setClipboard} pushNotification={props.pushNotification} recycleMode/>;if(props.appId==='gallery')return <Gallery openNode={props.openNode}/>;if(props.appId==='notes')return <Notes launch={props.launch} pushNotification={props.pushNotification}/>;if(props.appId==='imageViewer')return <ImageViewer launch={props.launch} settings={props.settings} updateSettings={props.updateSettings} pushNotification={props.pushNotification}/>;if(props.appId==='projects')return <Projects/>;if(props.appId==='browser')return <Browser/>;if(props.appId==='terminal')return <Terminal openNode={props.openNode}/>;if(props.appId==='calculator')return <Calculator/>;if(props.appId==='paint')return <Paint pushNotification={props.pushNotification}/>;if(props.appId==='media')return <MediaPlayer launch={props.launch} pushNotification={props.pushNotification}/>;if(props.appId==='themes')return <Themes settings={props.settings} updateSettings={props.updateSettings}/>;return <Settings settings={props.settings} updateSettings={props.updateSettings} onReset={props.onReset} openApp={props.openApp}/>} 
