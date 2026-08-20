import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, Dispatch, DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent, ReactNode, SetStateAction } from 'react'
import { AppContent } from './apps/AppContent'
import { appById, apps, desktopApps, pinnedApps, startApps } from './system/apps'
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
import {
  copyNodes,
  createFolder,
  createTextFile,
  desktopId,
  getNode,
  importFile,
  listChildren,
  loadVfs,
  moveNodes,
  nodePath,
  recycleNodes,
  renameNode,
  searchVfs,
  subscribeVfs,
  type VfsNode,
} from './system/vfs'
import type { AppId, ClipboardState, DesktopPosition, LaunchData, LuxSettings, SessionStage, WindowState } from './system/types'

const TASKBAR_HEIGHT = 48
const DESKTOP_ICON_WIDTH = 92
const DESKTOP_ICON_HEIGHT = 92
let windowSequence = 1
let notificationSequence = 1

type SnapMode = 'left' | 'right' | 'maximize' | null
type TrayPanel = 'network' | 'volume' | 'notifications' | null
type SelectionBox = { left: number; top: number; width: number; height: number }
type Notification = { id: number; title: string; message: string; time: string }

type DesktopEntry =
  | { key: string; type: 'app'; appId: AppId; name: string; className: string; icon: ReactNode }
  | { key: string; type: 'node'; node: VfsNode; name: string; className: string }

function formatTime(date: Date, seconds = false) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: seconds ? '2-digit' : undefined })
}
function formatDate(date: Date) { return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) }
function clamp(value: number, min: number, max: number) { return Math.min(Math.max(value, min), max) }
function defaultDesktopPosition(index: number): DesktopPosition {
  const rows = Math.max(1, Math.floor((window.innerHeight - TASKBAR_HEIGHT - 24) / 96))
  const column = Math.floor(index / rows)
  const row = index % rows
  return { x: 18 + column * 96, y: 18 + row * 96 }
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
      const oscillator = context.createOscillator(); const gain = context.createGain()
      oscillator.type = 'sine'; oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.001, context.currentTime + offset)
      gain.gain.exponentialRampToValueAtTime(0.9, context.currentTime + offset + 0.018)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + offset + 0.3)
      oscillator.connect(gain); gain.connect(master); oscillator.start(context.currentTime + offset); oscillator.stop(context.currentTime + offset + 0.32)
    })
    window.setTimeout(() => void context.close(), 1000)
  } catch { /* sound is optional */ }
}

function readDropFile(file: File, callback: (content: string) => void) {
  const reader = new FileReader(); reader.onload = () => callback(String(reader.result || ''))
  if (file.type.startsWith('image/') || file.type.startsWith('audio/')) reader.readAsDataURL(file); else reader.readAsText(file)
}

export default function App() {
  const [stage, setStage] = useState<SessionStage>('boot')
  const [now, setNow] = useState(new Date())
  const [settings, setSettings] = useState<LuxSettings>(loadSettings)
  const [windows, setWindows] = useState<WindowState[]>([])
  const [windowLayout, setWindowLayout] = useState(loadWindowLayout)
  const [desktopPositions, setDesktopPositions] = useState<Record<string, DesktopPosition>>(loadDesktopPositions)
  const [vfsNodes, setVfsNodes] = useState(loadVfs)
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null)
  const [startOpen, setStartOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedDesktop, setSelectedDesktop] = useState<string[]>([])
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [trayPanel, setTrayPanel] = useState<TrayPanel>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; targetKey?: string } | null>(null)
  const [powerOpen, setPowerOpen] = useState(false)
  const [loginPassword, setLoginPassword] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [snapPreview, setSnapPreview] = useState<SnapMode>(null)
  const [altTab, setAltTab] = useState({ open: false, index: 0 })
  const [pinnedOrder, setPinnedOrder] = useState<AppId[]>(() => loadPinnedOrder(pinnedApps.map(app => app.id)))
  const [recentApps, setRecentApps] = useState<AppId[]>([])
  const [peekDesktop, setPeekDesktop] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: notificationSequence++, title: 'LuxOS Mega Update', message: 'Desktop files, Recycle Bin, multi-window apps and file associations are ready.', time: 'Now' },
  ])
  const zRef = useRef(10)

  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer) }, [])
  useEffect(() => subscribeVfs(() => setVfsNodes(loadVfs())), [])
  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => savePinnedOrder(pinnedOrder), [pinnedOrder])
  useEffect(() => { const timer = window.setTimeout(() => saveDesktopPositions(desktopPositions), 140); return () => window.clearTimeout(timer) }, [desktopPositions])
  useEffect(() => {
    if (windows.length === 0) return
    const timer = window.setTimeout(() => {
      setWindowLayout(current => {
        const next = { ...current }
        ;[...windows].sort((a,b)=>a.z-b.z).forEach(item => {
          const geometry = item.maximized && item.restore ? item.restore : item
          next[item.appId] = { x: geometry.x, y: geometry.y, width: geometry.width, height: geometry.height, maximized: item.maximized }
        })
        saveWindowLayout(next); return next
      })
    }, 180)
    return () => window.clearTimeout(timer)
  }, [windows])
  useEffect(() => { if (stage !== 'boot') return; const timer = window.setTimeout(() => setStage('login'), settings.reduceMotion ? 300 : 1650); return () => window.clearTimeout(timer) }, [stage, settings.reduceMotion])

  const desktopEntries: DesktopEntry[] = useMemo(() => {
    const system: DesktopEntry[] = desktopApps.map(app => ({ key: `app:${app.id}`, type: 'app', appId: app.id, name: app.name, className: app.className, icon: app.icon }))
    const files: DesktopEntry[] = listChildren(desktopId(), vfsNodes).map(node => ({ key: `node:${node.id}`, type: 'node', node, name: node.name, className: `desktop-vfs-${node.kind}` }))
    return [...system, ...files]
  }, [vfsNodes])
  const sortedWindows = useMemo(() => [...windows].sort((a,b)=>b.z-a.z), [windows])

  const pushNotification = (message: string, title = 'LuxOS') => {
    setNotifications(current => [{ id: notificationSequence++, title, message, time: formatTime(new Date()) }, ...current].slice(0, 16))
  }
  const clearWindowMotion = (id: number) => window.setTimeout(() => setWindows(current => current.map(item => item.id === id ? { ...item, motion: undefined } : item)), settings.reduceMotion ? 0 : 210)
  const focusWindow = (id: number) => { const z=++zRef.current; setWindows(current=>current.map(item=>item.id===id?{...item,z,minimized:false,motion:item.minimized?'restoring':item.motion}:item)); clearWindowMotion(id) }

  const openApp = (appId: AppId, launch?: LaunchData) => {
    setRecentApps(current => [appId, ...current.filter(id => id !== appId)].slice(0, 7))
    setStartOpen(false); setContextMenu(null); setCalendarOpen(false); setTrayPanel(null)
    const app = appById[appId]
    if (!app.multiInstance) {
      const existing = windows.find(item => item.appId === appId)
      if (existing) { focusWindow(existing.id); return }
    }
    const saved = windowLayout[appId]
    const maxWidth=Math.max(320,window.innerWidth-40); const maxHeight=Math.max(260,window.innerHeight-TASKBAR_HEIGHT-40)
    const width=clamp(saved?.width??app.width, appId==='calculator'?320:420, maxWidth); const height=clamp(saved?.height??app.height, appId==='calculator'?420:300, maxHeight)
    const cascade=(windows.length%8)*24; const defaultX=(window.innerWidth-width)/2+cascade-70; const defaultY=(window.innerHeight-TASKBAR_HEIGHT-height)/2+cascade-30
    const x=clamp(saved?.x??defaultX,8,Math.max(8,window.innerWidth-width-8)); const y=clamp(saved?.y??defaultY,8,Math.max(8,window.innerHeight-TASKBAR_HEIGHT-height-8)); const z=++zRef.current; const id=windowSequence++
    setWindows(current=>[...current,{id,appId,launch,title:launch?.title,x,y,width,height,z,minimized:false,maximized:Boolean(saved?.maximized),motion:'opening',restore:saved?.maximized?{x,y,width,height}:undefined}]); clearWindowMotion(id)
  }

  const openNode = (node: VfsNode) => {
    if (node.kind === 'folder') openApp('files', { folderId: node.id, title: node.name })
    else if (node.kind === 'text') openApp('notes', { nodeId: node.id, title: node.name })
    else if (node.kind === 'image') openApp('imageViewer', { nodeId: node.id, title: node.name })
    else if (node.kind === 'audio') openApp('media', { nodeId: node.id, title: node.name })
  }

  const closeWindow=(id:number)=>{if(settings.reduceMotion){setWindows(current=>current.filter(item=>item.id!==id));return}setWindows(current=>current.map(item=>item.id===id?{...item,motion:'closing'}:item));window.setTimeout(()=>setWindows(current=>current.filter(item=>item.id!==id)),170)}
  const minimizeWindow=(id:number)=>{if(settings.reduceMotion){setWindows(current=>current.map(item=>item.id===id?{...item,minimized:true}:item));return}setWindows(current=>current.map(item=>item.id===id?{...item,motion:'minimizing'}:item));window.setTimeout(()=>setWindows(current=>current.map(item=>item.id===id?{...item,minimized:true,motion:undefined}:item)),170)}
  const toggleMaximize=(id:number)=>{setWindows(current=>current.map(item=>{if(item.id!==id)return item;if(item.maximized&&item.restore)return{...item,...item.restore,maximized:false,restore:undefined};return{...item,maximized:true,restore:{x:item.x,y:item.y,width:item.width,height:item.height}}}));focusWindow(id)}
  const applySnap=(id:number,mode:Exclude<SnapMode,null>)=>{const availableHeight=window.innerHeight-TASKBAR_HEIGHT;const halfWidth=Math.floor(window.innerWidth/2);setWindows(current=>current.map(item=>{if(item.id!==id)return item;const restore=item.restore??{x:item.x,y:item.y,width:item.width,height:item.height};if(mode==='maximize')return{...item,maximized:true,restore};if(mode==='left')return{...item,x:0,y:0,width:halfWidth,height:availableHeight,maximized:false,restore};return{...item,x:halfWidth,y:0,width:window.innerWidth-halfWidth,height:availableHeight,maximized:false,restore}}));focusWindow(id)}

  const beginDrag=(event:ReactPointerEvent,item:WindowState)=>{if(item.maximized||event.button!==0)return;event.preventDefault();event.stopPropagation();focusWindow(item.id);const startX=event.clientX,startY=event.clientY,startLeft=item.x,startTop=item.y;let pendingSnap:SnapMode=null;const onMove=(move:PointerEvent)=>{const x=clamp(startLeft+move.clientX-startX,-item.width+120,window.innerWidth-120);const y=clamp(startTop+move.clientY-startY,0,window.innerHeight-TASKBAR_HEIGHT-34);setWindows(current=>current.map(win=>win.id===item.id?{...win,x,y}:win));pendingSnap=move.clientY<=10?'maximize':move.clientX<=12?'left':move.clientX>=window.innerWidth-12?'right':null;setSnapPreview(pendingSnap)};const onUp=()=>{window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp);setSnapPreview(null);if(pendingSnap)applySnap(item.id,pendingSnap)};window.addEventListener('pointermove',onMove);window.addEventListener('pointerup',onUp)}
  const beginResize=(event:ReactPointerEvent,item:WindowState)=>{if(item.maximized||event.button!==0)return;event.preventDefault();event.stopPropagation();focusWindow(item.id);const startX=event.clientX,startY=event.clientY,startWidth=item.width,startHeight=item.height;const onMove=(move:PointerEvent)=>{const width=clamp(startWidth+move.clientX-startX,appById[item.appId].id==='calculator'?320:420,Math.max(420,window.innerWidth-item.x));const height=clamp(startHeight+move.clientY-startY,appById[item.appId].id==='calculator'?420:300,Math.max(300,window.innerHeight-TASKBAR_HEIGHT-item.y));setWindows(current=>current.map(win=>win.id===item.id?{...win,width,height,restore:undefined}:win))};const onUp=()=>{window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp)};window.addEventListener('pointermove',onMove);window.addEventListener('pointerup',onUp)}

  const beginDesktopIconDrag=(event:ReactPointerEvent,key:string,index:number)=>{if(event.button!==0)return;event.stopPropagation();const start=desktopPositions[key]??defaultDesktopPosition(index);const pointerStartX=event.clientX,pointerStartY=event.clientY;let moved=false;const onMove=(move:PointerEvent)=>{const dx=move.clientX-pointerStartX,dy=move.clientY-pointerStartY;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;if(!moved)return;const maxX=Math.max(4,window.innerWidth-DESKTOP_ICON_WIDTH-4),maxY=Math.max(4,window.innerHeight-TASKBAR_HEIGHT-DESKTOP_ICON_HEIGHT-4);setDesktopPositions(current=>({...current,[key]:{x:clamp(start.x+dx,4,maxX),y:clamp(start.y+dy,4,maxY)}}))};const onUp=()=>{window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp)};window.addEventListener('pointermove',onMove);window.addEventListener('pointerup',onUp)}
  const beginDesktopSelection=(event:ReactPointerEvent<HTMLElement>)=>{if(event.button!==0)return;setStartOpen(false);setCalendarOpen(false);setTrayPanel(null);setPowerOpen(false);setContextMenu(null);setSelectedDesktop([]);const startX=event.clientX,startY=event.clientY;const onMove=(move:PointerEvent)=>{const left=Math.min(startX,move.clientX),top=Math.min(startY,move.clientY),width=Math.abs(move.clientX-startX),height=Math.abs(move.clientY-startY);setSelectionBox({left,top,width,height});const right=left+width,bottom=top+height;setSelectedDesktop(desktopEntries.filter((entry,index)=>{const position=desktopPositions[entry.key]??defaultDesktopPosition(index);return position.x<right&&position.x+DESKTOP_ICON_WIDTH>left&&position.y<bottom&&position.y+DESKTOP_ICON_HEIGHT>top}).map(entry=>entry.key))};const onUp=()=>{window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp);setSelectionBox(null)};window.addEventListener('pointermove',onMove);window.addEventListener('pointerup',onUp)}

  useEffect(()=>{
    if(stage!=='desktop')return
    const onKeyDown=(event:KeyboardEvent)=>{
      const typing=event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement||event.target instanceof HTMLSelectElement
      if(event.key==='Tab'&&event.altKey&&sortedWindows.length>0){event.preventDefault();setStartOpen(false);setCalendarOpen(false);setTrayPanel(null);setAltTab(current=>({open:true,index:current.open?(current.index+1)%sortedWindows.length:0}));return}
      if(event.key==='Escape'){setStartOpen(false);setCalendarOpen(false);setTrayPanel(null);setContextMenu(null);setAltTab({open:false,index:0});setSelectionBox(null)}
      if(event.ctrlKey&&event.key==='Escape'){event.preventDefault();setStartOpen(current=>!current)}
      if(typing)return
      const nodeIds=selectedDesktop.filter(key=>key.startsWith('node:')).map(key=>key.slice(5))
      if(event.ctrlKey&&event.key.toLowerCase()==='a'){event.preventDefault();setSelectedDesktop(desktopEntries.map(entry=>entry.key))}
      if(event.ctrlKey&&event.key.toLowerCase()==='c'&&nodeIds.length){event.preventDefault();setClipboard({mode:'copy',nodeIds})}
      if(event.ctrlKey&&event.key.toLowerCase()==='x'&&nodeIds.length){event.preventDefault();setClipboard({mode:'cut',nodeIds})}
      if(event.ctrlKey&&event.key.toLowerCase()==='v'&&clipboard){event.preventDefault();clipboard.mode==='copy'?copyNodes(clipboard.nodeIds,desktopId()):moveNodes(clipboard.nodeIds,desktopId());if(clipboard.mode==='cut')setClipboard(null)}
      if(event.key==='Delete'&&nodeIds.length){event.preventDefault();recycleNodes(nodeIds);setSelectedDesktop([]);pushNotification(`${nodeIds.length} item(s) moved to Recycle Bin.`)}
      if(event.key==='F2'&&nodeIds.length===1){event.preventDefault();const node=getNode(nodeIds[0]);if(node&&!node.system){const name=window.prompt('Rename',node.name);if(name)renameNode(node.id,name)}}
      if(event.key==='Enter'&&selectedDesktop.length===1){const entry=desktopEntries.find(item=>item.key===selectedDesktop[0]);if(entry?.type==='app')openApp(entry.appId);else if(entry?.type==='node')openNode(entry.node)}
    }
    const onKeyUp=(event:KeyboardEvent)=>{if(event.key!=='Alt')return;setAltTab(current=>{if(!current.open||sortedWindows.length===0)return current;const target=sortedWindows[current.index%sortedWindows.length];if(target){const z=++zRef.current;setWindows(items=>items.map(item=>item.id===target.id?{...item,z,minimized:false}:item))}return{open:false,index:0}})}
    window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);return()=>{window.removeEventListener('keydown',onKeyDown);window.removeEventListener('keyup',onKeyUp)}
  },[stage,sortedWindows,selectedDesktop,desktopEntries,clipboard])

  useEffect(()=>{const closeMenus=()=>setContextMenu(null);window.addEventListener('pointerdown',closeMenus);return()=>window.removeEventListener('pointerdown',closeMenus)},[])

  const accentStyle=useMemo(()=>({'--glass-strength':`${settings.glassIntensity/100}`} as CSSProperties),[settings.glassIntensity])
  const login=()=>{playSystemSound('login',settings);setStage('welcome');setLoginPassword('');window.setTimeout(()=>{setStage('desktop');setToast(`Welcome to LuxOS, ${settings.userName}`);pushNotification('Your Mega Update desktop session is ready.');window.setTimeout(()=>setToast(null),3200)},settings.reduceMotion?250:1350)}
  const signOut=()=>{setWindows([]);setStartOpen(false);setPowerOpen(false);setStage('login')}
  const restart=()=>{playSystemSound('shutdown',settings);setPowerOpen(false);setWindows([]);setStage('boot')}
  const shutdown=()=>{playSystemSound('shutdown',settings);setPowerOpen(false);setStage('shutdown')}
  const reset=()=>{resetLuxStorage();setSettings(defaultSettings);setDesktopPositions({});setWindowLayout({});setPinnedOrder(pinnedApps.map(app=>app.id));setToast('LuxOS local settings were reset');pushNotification('Appearance, window and taskbar settings were reset. Virtual files were kept.')}

  const filteredApps=startApps.filter(app=>`${app.name} ${app.subtitle}`.toLowerCase().includes(search.toLowerCase()))
  const searchFiles=search.trim()?searchVfs(search,vfsNodes).slice(0,8):[]

  const contextEntry = contextMenu?.targetKey ? desktopEntries.find(entry => entry.key === contextMenu.targetKey) ?? null : null
  const contextNode = contextEntry?.type === 'node' ? contextEntry.node : null

  const windowTitle=(item:WindowState)=>{
    if(item.title)return item.title
    if(item.launch?.nodeId){const node=getNode(item.launch.nodeId,vfsNodes);if(node)return node.name}
    if(item.launch?.folderId){const node=getNode(item.launch.folderId,vfsNodes);if(node)return node.name}
    return appById[item.appId].name
  }

  const desktopNewFolder=()=>{const name=window.prompt('Folder name','New folder');if(name)createFolder(desktopId(),name)}
  const desktopNewText=()=>{const name=window.prompt('Text document name','New Text Document.txt');if(name)createTextFile(desktopId(),name)}
  const desktopPaste=()=>{if(!clipboard)return;clipboard.mode==='copy'?copyNodes(clipboard.nodeIds,desktopId()):moveNodes(clipboard.nodeIds,desktopId());if(clipboard.mode==='cut')setClipboard(null)}
  const handleDesktopDrop=(event:ReactDragEvent<HTMLElement>)=>{event.preventDefault();event.stopPropagation();const raw=event.dataTransfer.getData('application/x-lux-vfs');if(raw){try{const ids=JSON.parse(raw) as string[];const allAlreadyDesktop=ids.every(id=>getNode(id,vfsNodes)?.parentId===desktopId());if(allAlreadyDesktop&&ids.length===1){setDesktopPositions(current=>({...current,[`node:${ids[0]}`]:{x:clamp(event.clientX-43,4,Math.max(4,window.innerWidth-DESKTOP_ICON_WIDTH-4)),y:clamp(event.clientY-43,4,Math.max(4,window.innerHeight-TASKBAR_HEIGHT-DESKTOP_ICON_HEIGHT-4))}}))}else moveNodes(ids,desktopId())}catch{}return}Array.from(event.dataTransfer.files).forEach(file=>{const maxSize=file.type.startsWith('image/')||file.type.startsWith('audio/')?20_000_000:2_000_000;if(file.size>maxSize){window.alert(`${file.name} is too large for this LuxOS browser-storage build.`);return}readDropFile(file,content=>{try{importFile(desktopId(),file,content)}catch(error){window.alert(error instanceof Error?error.message:'Import failed.')}})})}

  return <main className={`luxos desktop-os accent-${settings.accent} wallpaper-${settings.wallpaper} icon-size-${settings.desktopIconSize} ${settings.reduceMotion?'reduce-motion':''}`} style={accentStyle}>
    <div className="desktop-wallpaper" aria-hidden="true" style={settings.wallpaper==='custom'&&settings.customWallpaper?{backgroundImage:`linear-gradient(145deg,rgba(4,6,15,.28),rgba(18,8,40,.18)),url(${settings.customWallpaper})`}:undefined}><i className="beam beam-one"/><i className="beam beam-two"/><i className="glow glow-one"/><i className="glow glow-two"/><i className="stars"/></div>
    {stage==='boot'&&<BootScreen/>}
    {stage==='login'&&<LoginScreen now={now} settings={settings} password={loginPassword} setPassword={setLoginPassword} login={login} powerOpen={powerOpen} setPowerOpen={setPowerOpen} restart={restart} shutdown={shutdown}/>} 
    {stage==='welcome'&&<WelcomeScreen settings={settings}/>} {stage==='shutdown'&&<ShutdownScreen restart={restart}/>} 
    {stage==='desktop'&&<section className="desktop" onPointerDown={beginDesktopSelection} onDragOver={event=>event.preventDefault()} onDrop={handleDesktopDrop} onContextMenu={event=>{event.preventDefault();setSelectionBox(null);setContextMenu({x:event.clientX,y:event.clientY})}}>
      <div className="desktop-icons">{desktopEntries.map((entry,index)=>{const position=desktopPositions[entry.key]??defaultDesktopPosition(index);return <button key={entry.key} draggable={entry.type==='node'} className={`desktop-icon ${selectedDesktop.includes(entry.key)?'selected':''}`} style={{left:position.x,top:position.y}} onDragStart={event=>{if(entry.type==='node'){event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('application/x-lux-vfs',JSON.stringify([entry.node.id]))}}} onPointerDown={event=>{event.stopPropagation();if(entry.type==='app')beginDesktopIconDrag(event,entry.key,index)}} onClick={event=>{event.stopPropagation();setSelectedDesktop(current=>event.ctrlKey?(current.includes(entry.key)?current.filter(key=>key!==entry.key):[...current,entry.key]):[entry.key])}} onContextMenu={event=>{event.preventDefault();event.stopPropagation();setSelectedDesktop([entry.key]);setContextMenu({x:event.clientX,y:event.clientY,targetKey:entry.key})}} onDoubleClick={()=>entry.type==='app'?openApp(entry.appId):openNode(entry.node)}>{entry.type==='app'?<span className={`app-tile ${entry.className}`}>{entry.icon}</span>:<span className={`desktop-file-icon vfs-icon vfs-${entry.node.kind}`}/>} {settings.showDesktopLabels&&<span>{entry.name}</span>}</button>})}</div>
      {selectionBox&&<div className="desktop-selection" style={selectionBox}/>} {snapPreview&&<SnapPreview mode={snapPreview}/>} 
      <div className={`window-layer ${peekDesktop?'peek-desktop':''}`}>{windows.map(item=>{if(item.minimized)return null;const app=appById[item.appId];const title=windowTitle(item);return <article key={item.id} className={`os-window ${item.maximized?'maximized':''} ${item.motion?`window-${item.motion}`:''}`} style={item.maximized?{zIndex:item.z}:{zIndex:item.z,left:item.x,top:item.y,width:item.width,height:item.height}} onPointerDown={event=>{event.stopPropagation();focusWindow(item.id)}} onContextMenu={event=>event.stopPropagation()}><header className="window-titlebar" onPointerDown={event=>beginDrag(event,item)} onDoubleClick={()=>toggleMaximize(item.id)}><div className="window-title"><span className={`mini-tile ${app.className}`}>{app.icon}</span><span>{title}</span></div><div className="window-controls" onDoubleClick={event=>event.stopPropagation()} onPointerDown={event=>event.stopPropagation()}><button aria-label="Minimize" onClick={()=>minimizeWindow(item.id)}>—</button><button aria-label="Maximize" onClick={()=>toggleMaximize(item.id)}>□</button><button className="close" aria-label="Close" onClick={()=>closeWindow(item.id)}>×</button></div></header><div className="window-menu"><button>File</button><button>Edit</button><button>View</button><button>Help</button></div><div className="window-body"><AppContent appId={item.appId} launch={item.launch} settings={settings} updateSettings={setSettings} openApp={openApp} openNode={openNode} onReset={reset} clipboard={clipboard} setClipboard={setClipboard} pushNotification={pushNotification}/></div>{!item.maximized&&<button className="resize-handle" aria-label="Resize window" onPointerDown={event=>beginResize(event,item)}/>}</article>})}</div>
      {contextMenu&&<div className="desktop-context" style={{left:Math.min(contextMenu.x,window.innerWidth-220),top:Math.min(contextMenu.y,window.innerHeight-340)}} onPointerDown={event=>event.stopPropagation()}>{contextEntry? <>{<button onClick={()=>contextEntry.type==='app'?openApp(contextEntry.appId):openNode(contextEntry.node)}>Open</button>}{contextNode&&<><hr/><button onClick={()=>setClipboard({mode:'copy',nodeIds:[contextNode.id]})}>Copy</button><button onClick={()=>setClipboard({mode:'cut',nodeIds:[contextNode.id]})}>Cut</button><button onClick={()=>{const name=window.prompt('Rename',contextNode.name);if(name)renameNode(contextNode.id,name)}}>Rename</button><button onClick={()=>{recycleNodes([contextNode.id]);setSelectedDesktop([])}}>Delete</button><hr/><button onClick={()=>setToast(`${contextNode.name} • ${contextNode.kind} • ${nodePath(contextNode.id)}`)}>Properties</button></>}</> : <><button>View <span>›</span></button><button onClick={()=>setToast('Desktop refreshed')}>Refresh</button><hr/><button onClick={desktopNewFolder}>New folder</button><button onClick={desktopNewText}>New text document</button><button disabled={!clipboard} onClick={desktopPaste}>Paste</button><hr/><button onClick={()=>openApp('themes')}>Personalize</button><button onClick={()=>openApp('settings')}>Control Panel</button></>}</div>}
      {startOpen&&<StartMenu search={search} setSearch={setSearch} apps={filteredApps} fileResults={searchFiles} recentApps={recentApps} settings={settings} openApp={openApp} openNode={openNode} signOut={signOut} setPowerOpen={setPowerOpen} powerOpen={powerOpen} shutdown={shutdown} restart={restart}/>} 
      {calendarOpen&&<CalendarPanel now={now}/>} {trayPanel==='network'&&<NetworkFlyout/>} {trayPanel==='volume'&&<VolumeFlyout settings={settings} updateSettings={setSettings} testSound={()=>playSystemSound('notify',settings)}/>} {trayPanel==='notifications'&&<NotificationFlyout notifications={notifications} clear={()=>setNotifications([])}/>} {altTab.open&&<AltTabSwitcher windows={sortedWindows} index={altTab.index} getTitle={windowTitle}/>} {toast&&<div className="toast glass-panel"><span className="toast-mark">L</span><div><strong>LuxOS</strong><small>{toast}</small></div></div>}
      <Taskbar now={now} settings={settings} windows={windows} startOpen={startOpen} setStartOpen={value=>{setStartOpen(value);setCalendarOpen(false);setTrayPanel(null)}} openApp={openApp} focusWindow={focusWindow} closeWindow={closeWindow} setWindows={setWindows} minimizeWindow={minimizeWindow} pinnedOrder={pinnedOrder} setPinnedOrder={setPinnedOrder} setPeekDesktop={setPeekDesktop} notificationCount={notifications.length} calendarOpen={calendarOpen} setCalendarOpen={value=>{setCalendarOpen(value);setTrayPanel(null);setStartOpen(false)}} trayPanel={trayPanel} setTrayPanel={value=>{setTrayPanel(value);setCalendarOpen(false);setStartOpen(false)}} getTitle={windowTitle}/>
    </section>}
  </main>
}

function SnapPreview({mode}:{mode:Exclude<SnapMode,null>}){return <div className={`snap-preview snap-${mode}`}><span/></div>}
function UserAvatar({settings,small=false}:{settings:LuxSettings;small?:boolean}){return <div className={`user-avatar ${small?'small':''}`} style={settings.userAvatar?{backgroundImage:`url(${settings.userAvatar})`}:undefined}>{!settings.userAvatar&&<span>{settings.userName.slice(0,1).toUpperCase()||'L'}</span>}</div>}
function BootScreen(){return <section className="session-screen boot-screen"><div className="boot-brand"><span className="lux-orb">L</span><div><strong>LuxOS</strong><small>Desktop Mega Update</small></div></div><div className="boot-dots"><i/><i/><i/><i/></div><small className="session-copyright">© Lux</small></section>}
function LoginScreen({now,settings,password,setPassword,login,powerOpen,setPowerOpen,restart,shutdown}:{now:Date;settings:LuxSettings;password:string;setPassword:(value:string)=>void;login:()=>void;powerOpen:boolean;setPowerOpen:(value:boolean)=>void;restart:()=>void;shutdown:()=>void}){return <section className="session-screen login-screen"><div className="login-brand"><span className="brand-gem">L</span><strong>LuxOS</strong></div><div className="login-card"><UserAvatar settings={settings}/><h1>{settings.userName}</h1><form onSubmit={event=>{event.preventDefault();login()}}><div className="password-wrap"><input type="password" autoFocus value={password} onChange={event=>setPassword(event.target.value)} placeholder="Password" aria-label="Password"/><button aria-label="Sign in">→</button></div></form><button className="switch-user">Switch user</button></div><footer className="login-footer"><div><strong>{formatTime(now,settings.showSeconds)}</strong><small>{formatDate(now)}</small></div><div className="login-access"><button title="Accessibility">◉</button><button title="Network">⌁</button><div className="power-anchor"><button className="power-button" title="Power" onClick={()=>setPowerOpen(!powerOpen)}>⏻</button>{powerOpen&&<div className="login-power-menu"><button onClick={restart}>Restart</button><button onClick={shutdown}>Shut down</button></div>}</div></div></footer></section>}
function WelcomeScreen({settings}:{settings:LuxSettings}){return <section className="session-screen welcome-screen"><UserAvatar settings={settings} small/><h1>Welcome</h1><div className="welcome-spinner"><i/><i/><i/><i/><i/></div><small>Restoring your desktop...</small></section>}
function ShutdownScreen({restart}:{restart:()=>void}){return <section className="session-screen shutdown-screen"><div className="boot-brand"><span className="lux-orb">L</span><div><strong>LuxOS</strong><small>Shutting down...</small></div></div><button onClick={restart}>Start LuxOS again</button></section>}

function StartMenu({search,setSearch,apps:fileApps,fileResults,recentApps,settings,openApp,openNode,signOut,setPowerOpen,powerOpen,shutdown,restart}:{search:string;setSearch:(value:string)=>void;apps:typeof apps;fileResults:VfsNode[];recentApps:AppId[];settings:LuxSettings;openApp:(id:AppId,launch?:LaunchData)=>void;openNode:(node:VfsNode)=>void;signOut:()=>void;setPowerOpen:(value:boolean)=>void;powerOpen:boolean;shutdown:()=>void;restart:()=>void}){
  const recent=recentApps.map(id=>appById[id]).filter(app=>app&&!app.hiddenFromStart)
  return <aside className="start-menu glass-panel start-menu-mega" onPointerDown={event=>event.stopPropagation()}><div className="start-user"><div className="start-avatar" style={settings.userAvatar?{backgroundImage:`url(${settings.userAvatar})`}:undefined}>{!settings.userAvatar&&(settings.userName.slice(0,1).toUpperCase()||'L')}</div><div><strong>{settings.userName}</strong><small>LuxOS User</small></div></div><div className="start-columns"><div className="start-left">{recent.length>0&&!search&&<div className="start-recent"><span className="start-section-label">Recently used</span>{recent.slice(0,4).map(app=><button key={app.id} onClick={()=>openApp(app.id)}><span className={`start-app-icon ${app.className}`}>{app.icon}</span><div><strong>{app.name}</strong><small>{app.subtitle}</small></div></button>)}</div>}<div className="start-app-list">{fileApps.map(app=><button key={app.id} onClick={()=>openApp(app.id)}><span className={`start-app-icon ${app.className}`}>{app.icon}</span><div><strong>{app.name}</strong><small>{app.subtitle}</small></div></button>)}{search&&fileResults.length>0&&<><span className="start-section-label search-files-label">Files</span>{fileResults.map(node=><button key={node.id} onClick={()=>openNode(node)}><span className={`start-vfs-icon vfs-icon vfs-${node.kind}`}/><div><strong>{node.name}</strong><small>{nodePath(node.id)}</small></div></button>)}</>}</div><div className="start-search"><input autoFocus value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search programs and files"/><span>⌕</span></div></div><div className="start-right"><button onClick={()=>openApp('files')}>Computer</button><button onClick={()=>openApp('files',{folderId:'documents',title:'Documents'})}>Documents</button><button onClick={()=>openApp('gallery')}>Pictures</button><button onClick={()=>openApp('media')}>Music</button><button onClick={()=>openApp('projects')}>Projects</button><hr/><button onClick={()=>openApp('calculator')}>Calculator</button><button onClick={()=>openApp('paint')}>Lux Paint</button><button onClick={()=>openApp('settings')}>Control Panel</button><button onClick={()=>openApp('themes')}>Personalize</button></div></div><div className="start-footer"><button className="signout" onClick={signOut}>Lock</button><div className="start-power"><button onClick={shutdown}>Shut down</button><button className="power-arrow" onClick={()=>setPowerOpen(!powerOpen)}>▴</button>{powerOpen&&<div className="power-flyout"><button onClick={signOut}>Log off</button><button onClick={restart}>Restart</button><button onClick={shutdown}>Shut down</button></div>}</div></div></aside>
}

function Taskbar({now,settings,windows,startOpen,setStartOpen,openApp,focusWindow,closeWindow,setWindows,minimizeWindow,pinnedOrder,setPinnedOrder,setPeekDesktop,notificationCount,calendarOpen,setCalendarOpen,trayPanel,setTrayPanel,getTitle}:{now:Date;settings:LuxSettings;windows:WindowState[];startOpen:boolean;setStartOpen:(value:boolean)=>void;openApp:(id:AppId)=>void;focusWindow:(id:number)=>void;closeWindow:(id:number)=>void;setWindows:Dispatch<SetStateAction<WindowState[]>>;minimizeWindow:(id:number)=>void;pinnedOrder:AppId[];setPinnedOrder:Dispatch<SetStateAction<AppId[]>>;setPeekDesktop:(value:boolean)=>void;notificationCount:number;calendarOpen:boolean;setCalendarOpen:(value:boolean)=>void;trayPanel:TrayPanel;setTrayPanel:(value:TrayPanel)=>void;getTitle:(item:WindowState)=>string}){
  const[hoveredApp,setHoveredApp]=useState<AppId|null>(null);const topVisible=[...windows].filter(item=>!item.minimized).sort((a,b)=>b.z-a.z)[0]
  const grouped=useMemo(()=>{const map=new Map<AppId,WindowState[]>();windows.forEach(win=>map.set(win.appId,[...(map.get(win.appId)||[]),win]));for(const [id,items]of map)map.set(id,items.sort((a,b)=>b.z-a.z));return map},[windows])
  const toggleGroup=(appId:AppId)=>{const group=grouped.get(appId)||[];if(group.length===0){openApp(appId);return}if(group.length===1){const item=group[0];if(item.minimized||topVisible?.id!==item.id)focusWindow(item.id);else minimizeWindow(item.id);return}focusWindow(group[0].id)}
  const movePin=(dragged:AppId,target:AppId)=>{if(dragged===target)return;setPinnedOrder(current=>{const next=current.filter(id=>id!==dragged);const index=next.indexOf(target);next.splice(index<0?next.length:index,0,dragged);return next})}
  const renderSlot=(appId:AppId)=>{const app=appById[appId];const group=grouped.get(appId)||[];const active=group.some(win=>win.id===topVisible?.id&&!win.minimized);return <div className="taskbar-slot" key={appId} draggable onDragStart={event=>{event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/lux-pin',appId)}} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();const dragged=event.dataTransfer.getData('text/lux-pin') as AppId;if(dragged)movePin(dragged,appId)}} onPointerEnter={()=>group.length&&setHoveredApp(appId)} onPointerLeave={()=>setHoveredApp(current=>current===appId?null:current)}><button className={`taskbar-app ${group.length?'running':''} ${active?'active':''}`} onClick={()=>toggleGroup(appId)} title={`${app.name}${group.length>1?` • ${group.length} windows`:''}`}><span className={`task-icon ${app.className}`}>{app.icon}</span>{group.length>1&&<i className="task-count">{group.length}</i>}</button>{group.length>0&&hoveredApp===appId&&<TaskbarPreviewGroup items={group} closeWindow={closeWindow} focusWindow={focusWindow} getTitle={getTitle}/>}</div>}
  const unpinned=[...new Set(windows.filter(win=>!pinnedOrder.includes(win.appId)).map(win=>win.appId))]
  return <footer className="taskbar taskbar-v4 taskbar-mega" onPointerDown={event=>event.stopPropagation()}><button className={`start-orb ${startOpen?'active':''}`} onClick={()=>setStartOpen(!startOpen)} aria-label="Start"><span>L</span></button><div className="taskbar-pinned">{pinnedOrder.map(renderSlot)}</div><div className="taskbar-running">{unpinned.map(renderSlot)}</div><div className="system-tray"><button title="Hidden icons">▴</button><button className={trayPanel==='network'?'active':''} title="Network" onClick={()=>setTrayPanel(trayPanel==='network'?null:'network')}>⌁</button><button className={trayPanel==='volume'?'active':''} title="Volume" onClick={()=>setTrayPanel(trayPanel==='volume'?null:'volume')}>◖</button><button className={`notification-tray ${trayPanel==='notifications'?'active':''}`} title="Notifications" onClick={()=>setTrayPanel(trayPanel==='notifications'?null:'notifications')}><span>◇</span>{notificationCount>0&&<i>{notificationCount>9?'9+':notificationCount}</i>}</button><button className={`tray-clock ${calendarOpen?'active':''}`} onClick={()=>setCalendarOpen(!calendarOpen)}><strong>{formatTime(now,settings.showSeconds)}</strong><small>{now.toLocaleDateString([],{month:'numeric',day:'numeric',year:'2-digit'})}</small></button><button className="show-desktop" onPointerEnter={()=>setPeekDesktop(true)} onPointerLeave={()=>setPeekDesktop(false)} onClick={()=>{setPeekDesktop(false);setWindows(current=>current.map(win=>({...win,minimized:true})))}} title="Show desktop / Aero Peek"/></div></footer>
}
function TaskbarPreviewGroup({items,closeWindow,focusWindow,getTitle}:{items:WindowState[];closeWindow:(id:number)=>void;focusWindow:(id:number)=>void;getTitle:(item:WindowState)=>string}){return <div className={`taskbar-preview-group ${items.length>1?'multiple':''}`}>{items.slice(0,5).map(item=>{const app=appById[item.appId];return <div className="taskbar-preview" key={item.id} onClick={()=>focusWindow(item.id)}><div className="preview-title"><span className={`task-icon ${app.className}`}>{app.icon}</span><strong>{getTitle(item)}</strong><button aria-label="Close" onClick={event=>{event.stopPropagation();closeWindow(item.id)}}>×</button></div><div className="preview-screen"><span className={`preview-app-icon ${app.className}`}>{app.icon}</span><small>{item.minimized?'Minimized':app.subtitle}</small></div></div>})}</div>}
function AltTabSwitcher({windows,index,getTitle}:{windows:WindowState[];index:number;getTitle:(item:WindowState)=>string}){if(!windows.length)return null;return <div className="alt-tab-backdrop"><div className="alt-tab-switcher glass-panel"><div className="alt-tab-title">Switch windows</div><div className="alt-tab-grid">{windows.map((item,itemIndex)=>{const app=appById[item.appId];return <div key={item.id} className={`alt-tab-item ${itemIndex===index%windows.length?'active':''}`}><span className={`alt-tab-icon ${app.className}`}>{app.icon}</span><strong>{getTitle(item)}</strong><small>{item.minimized?'Minimized':app.subtitle}</small></div>})}</div><small className="alt-tab-hint">Hold Alt and tap Tab</small></div></div>}
function NetworkFlyout(){return <aside className="tray-flyout network-flyout glass-panel" onPointerDown={event=>event.stopPropagation()}><div className="flyout-heading"><strong>Network</strong><small>Connected</small></div><button className="network-entry"><span className="wifi-bars"><i/><i/><i/></span><div><strong>LuxNet</strong><small>Internet access</small></div><em>Connected</em></button><div className="flyout-footer">Network and sharing settings</div></aside>}
function VolumeFlyout({settings,updateSettings,testSound}:{settings:LuxSettings;updateSettings:(settings:LuxSettings)=>void;testSound:()=>void}){return <aside className="tray-flyout volume-flyout glass-panel" onPointerDown={event=>event.stopPropagation()}><div className="flyout-heading"><strong>Speakers</strong><small>LuxOS Audio</small></div><div className="volume-control"><span>◖</span><input aria-label="Master volume" type="range" min="0" max="100" value={settings.masterVolume} onChange={event=>updateSettings({...settings,masterVolume:Number(event.target.value)})} onPointerUp={testSound}/><strong>{settings.masterVolume}</strong></div><button className="mixer-button" onClick={testSound}>Test system sound</button></aside>}
function NotificationFlyout({notifications,clear}:{notifications:Notification[];clear:()=>void}){return <aside className="tray-flyout notification-flyout glass-panel" onPointerDown={event=>event.stopPropagation()}><div className="notification-header"><div><strong>Notifications</strong><small>{notifications.length?`${notifications.length} new`:'You’re all caught up'}</small></div>{notifications.length>0&&<button onClick={clear}>Clear all</button>}</div><div className="notification-list">{notifications.length?notifications.map(item=><article key={item.id}><span className="notification-mark">L</span><div><div><strong>{item.title}</strong><time>{item.time}</time></div><p>{item.message}</p></div></article>):<div className="notification-empty"><span>◇</span><strong>No new notifications</strong><small>LuxOS will surface system activity here.</small></div>}</div></aside>}
function CalendarPanel({now}:{now:Date}){const first=new Date(now.getFullYear(),now.getMonth(),1);const count=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();const cells:Array<number|null>=[...Array.from({length:first.getDay()},()=>null),...Array.from({length:count},(_,index)=>index+1)];return <aside className="calendar-panel glass-panel" onPointerDown={event=>event.stopPropagation()}><div className="calendar-time">{formatTime(now)}</div><div className="calendar-date">{formatDate(now)}</div><div className="calendar-month"><strong>{now.toLocaleDateString([],{month:'long',year:'numeric'})}</strong><div className="week-row">{'SMTWTFS'.split('').map((day,index)=><span key={`${day}-${index}`}>{day}</span>)}</div><div className="days-grid">{cells.map((day,index)=><span key={index} className={day===now.getDate()?'today':''}>{day}</span>)}</div></div></aside>}
