import { clearAssets, deleteAsset, putAsset } from './assetStore'
export type VfsKind = 'folder' | 'text' | 'image' | 'audio'

export interface VfsNode {
  id: string
  name: string
  kind: VfsKind
  parentId: string | null
  content?: string
  assetKey?: string
  mime?: string
  createdAt: number
  updatedAt: number
  deletedAt?: number
  originalParentId?: string | null
  system?: boolean
}

const VFS_KEY = 'luxos.vfs.v5'
const LEGACY_VFS_KEY = 'luxos.vfs.v4'
const ROOT_ID = 'root'
const RECYCLE_ID = 'recycle-bin'
const VFS_EVENT = 'luxos:vfs-change'

function id(prefix = 'node') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function initialNodes(): VfsNode[] {
  const now = Date.now()
  const folders = [
    ['desktop', 'Desktop'],
    ['documents', 'Documents'],
    ['pictures', 'Pictures'],
    ['music', 'Music'],
    ['projects', 'Projects'],
    ['downloads', 'Downloads'],
    ['archive', 'Lux Archive'],
  ] as const
  return [
    { id: ROOT_ID, name: 'LuxOS (C:)', kind: 'folder', parentId: null, createdAt: now, updatedAt: now, system: true },
    { id: RECYCLE_ID, name: 'Recycle Bin', kind: 'folder', parentId: ROOT_ID, createdAt: now, updatedAt: now, system: true },
    ...folders.map(([folderId, name]) => ({ id: folderId, name, kind: 'folder' as const, parentId: ROOT_ID, createdAt: now, updatedAt: now, system: true })),
    { id: 'welcome-txt', name: 'Welcome.txt', kind: 'text', parentId: 'documents', content: 'Welcome to LuxOS Desktop 1.0 Mega Update.\n\nDesktop files, Recycle Bin, copy/cut/paste, multiple windows, file associations, Gallery, Photo Viewer, Paint, Media Player and the Terminal all share this virtual disk.', mime: 'text/plain', createdAt: now, updatedAt: now },
    { id: 'notes-txt', name: 'Notes.txt', kind: 'text', parentId: 'documents', content: '', mime: 'text/plain', createdAt: now, updatedAt: now },
    { id: 'readme-txt', name: 'README.txt', kind: 'text', parentId: 'projects', content: 'Lux Projects\n\nUse this folder as a home for project notes and files.', mime: 'text/plain', createdAt: now, updatedAt: now },
    { id: 'desktop-readme', name: 'Welcome to LuxOS.txt', kind: 'text', parentId: 'desktop', content: 'This desktop is now connected directly to C:\\Desktop.\n\nCreate, rename, copy, move and delete files here and they are the same files you see in Computer.', mime: 'text/plain', createdAt: now, updatedAt: now },
  ]
}

function normalize(nodes: VfsNode[]) {
  if (!nodes.some(node => node.id === ROOT_ID)) return initialNodes()
  const next = [...nodes]
  const now = Date.now()
  const ensureFolder = (folderId: string, name: string, system = true) => {
    if (!next.some(node => node.id === folderId)) next.push({ id: folderId, name, kind: 'folder', parentId: ROOT_ID, createdAt: now, updatedAt: now, system })
  }
  ensureFolder(RECYCLE_ID, 'Recycle Bin')
  ensureFolder('desktop', 'Desktop')
  ensureFolder('documents', 'Documents')
  ensureFolder('pictures', 'Pictures')
  ensureFolder('music', 'Music')
  ensureFolder('projects', 'Projects')
  ensureFolder('downloads', 'Downloads')
  return next
}

function emit() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(VFS_EVENT))
}

export function subscribeVfs(callback: () => void) {
  window.addEventListener(VFS_EVENT, callback)
  const storage = (event: StorageEvent) => { if (event.key === VFS_KEY) callback() }
  window.addEventListener('storage', storage)
  return () => {
    window.removeEventListener(VFS_EVENT, callback)
    window.removeEventListener('storage', storage)
  }
}

export function loadVfs(): VfsNode[] {
  try {
    const raw = localStorage.getItem(VFS_KEY) || localStorage.getItem(LEGACY_VFS_KEY)
    const parsed = raw ? JSON.parse(raw) as VfsNode[] : null
    const nodes = parsed && Array.isArray(parsed) ? normalize(parsed) : initialNodes()
    if (!localStorage.getItem(VFS_KEY)) saveVfs(nodes, false)
    return nodes
  } catch {
    const nodes = initialNodes()
    saveVfs(nodes, false)
    return nodes
  }
}

export function saveVfs(nodes: VfsNode[], notify = true) {
  try {
    localStorage.setItem(VFS_KEY, JSON.stringify(nodes))
    if (notify) emit()
  } catch {
    throw new Error('LuxOS virtual storage is full. Empty Recycle Bin or remove large imported files and try again.')
  }
}

export function resetVfs() {
  localStorage.removeItem(VFS_KEY)
  localStorage.removeItem(LEGACY_VFS_KEY)
  void clearAssets().catch(() => undefined)
  const nodes = initialNodes()
  saveVfs(nodes)
  return nodes
}

export function rootId() { return ROOT_ID }
export function recycleId() { return RECYCLE_ID }
export function desktopId() { return 'desktop' }

export function getNode(nodeId: string, nodes = loadVfs()) {
  return nodes.find(node => node.id === nodeId) ?? null
}

export function listChildren(parentId: string, nodes = loadVfs()) {
  return nodes
    .filter(node => node.parentId === parentId)
    .sort((a, b) => Number(a.kind !== 'folder') - Number(b.kind !== 'folder') || a.name.localeCompare(b.name))
}

export function createFolder(parentId: string, name: string) {
  const nodes = loadVfs()
  const clean = uniqueName(parentId, sanitizeName(name || 'New folder'), nodes)
  const now = Date.now()
  const node: VfsNode = { id: id('folder'), name: clean, kind: 'folder', parentId, createdAt: now, updatedAt: now }
  saveVfs([...nodes, node])
  return node
}

export function createTextFile(parentId: string, name: string, content = '') {
  const nodes = loadVfs()
  const base = sanitizeName(name || 'New Text Document.txt')
  const withExtension = base.toLowerCase().endsWith('.txt') ? base : `${base}.txt`
  const clean = uniqueName(parentId, withExtension, nodes)
  const now = Date.now()
  const node: VfsNode = { id: id('text'), name: clean, kind: 'text', parentId, content, mime: 'text/plain', createdAt: now, updatedAt: now }
  saveVfs([...nodes, node])
  return node
}

export function createImageFile(parentId: string, name: string, dataUrl: string, mime = 'image/png') {
  const nodes = loadVfs()
  const clean = uniqueName(parentId, sanitizeName(name || 'Untitled.png'), nodes)
  const now = Date.now()
  const nodeId = id('image')
  const external = dataUrl.length > 300_000
  const node: VfsNode = { id: nodeId, name: clean, kind: 'image', parentId, content: external ? undefined : dataUrl, assetKey: external ? nodeId : undefined, mime, createdAt: now, updatedAt: now }
  saveVfs([...nodes, node])
  if (external) storeExternalAssetWithFallback(nodeId, dataUrl)
  return node
}

export function importFile(parentId: string, file: File, content: string) {
  const nodes = loadVfs()
  let kind: VfsKind = 'text'
  if (file.type.startsWith('image/')) kind = 'image'
  else if (file.type.startsWith('audio/')) kind = 'audio'
  const clean = uniqueName(parentId, sanitizeName(file.name || (kind === 'image' ? 'Image' : kind === 'audio' ? 'Audio' : 'Document.txt')), nodes)
  const now = Date.now()
  const nodeId = id(kind)
  const external = (kind === 'image' || kind === 'audio') && content.length > 300_000
  const node: VfsNode = { id: nodeId, name: clean, kind, parentId, content: external ? undefined : content, assetKey: external ? nodeId : undefined, mime: file.type || undefined, createdAt: now, updatedAt: now }
  saveVfs([...nodes, node])
  if (external) storeExternalAssetWithFallback(nodeId, content)
  return node
}

export function updateText(nodeId: string, content: string) {
  const nodes = loadVfs().map(node => node.id === nodeId ? { ...node, content, updatedAt: Date.now() } : node)
  saveVfs(nodes)
}

export function renameNode(nodeId: string, name: string) {
  const nodes = loadVfs()
  const node = getNode(nodeId, nodes)
  if (!node || node.id === ROOT_ID || node.system) return node
  const clean = uniqueName(node.parentId ?? ROOT_ID, sanitizeName(name || node.name), nodes.filter(item => item.id !== nodeId))
  const updated = { ...node, name: clean, updatedAt: Date.now() }
  saveVfs(nodes.map(item => item.id === nodeId ? updated : item))
  return updated
}

export function moveNodes(nodeIds: string[], targetParentId: string) {
  const nodes = loadVfs()
  const target = getNode(targetParentId, nodes)
  if (!target || target.kind !== 'folder') throw new Error('The destination folder does not exist.')
  const selected = compactSelection(nodeIds, nodes)
  const blocked = new Set<string>([ROOT_ID, RECYCLE_ID])
  let next = [...nodes]
  selected.forEach(nodeId => {
    const node = getNode(nodeId, next)
    if (!node || node.system || blocked.has(node.id) || node.id === targetParentId || isDescendant(targetParentId, node.id, next)) return
    const clean = uniqueName(targetParentId, node.name, next.filter(item => item.id !== node.id))
    next = next.map(item => item.id === node.id ? { ...item, parentId: targetParentId, name: clean, updatedAt: Date.now(), deletedAt: targetParentId === RECYCLE_ID ? Date.now() : undefined, originalParentId: targetParentId === RECYCLE_ID ? item.parentId : undefined } : item)
  })
  saveVfs(next)
}

export function copyNodes(nodeIds: string[], targetParentId: string) {
  const nodes = loadVfs()
  const target = getNode(targetParentId, nodes)
  if (!target || target.kind !== 'folder') throw new Error('The destination folder does not exist.')
  let next = [...nodes]
  const selected = compactSelection(nodeIds, nodes)
  selected.forEach(nodeId => {
    const source = getNode(nodeId, nodes)
    if (!source || source.system) return
    const map = new Map<string, string>()
    const copyRecursive = (sourceNode: VfsNode, parentId: string) => {
      const newId = id(sourceNode.kind)
      map.set(sourceNode.id, newId)
      const name = sourceNode.id === nodeId ? uniqueName(parentId, sourceNode.name, next) : sourceNode.name
      const now = Date.now()
      const clone: VfsNode = { ...sourceNode, id: newId, name, parentId, createdAt: now, updatedAt: now, deletedAt: undefined, originalParentId: undefined, system: false }
      next.push(clone)
      listChildren(sourceNode.id, nodes).forEach(child => copyRecursive(child, newId))
    }
    copyRecursive(source, targetParentId)
  })
  saveVfs(next)
}

export function recycleNodes(nodeIds: string[]) {
  const nodes = loadVfs()
  let next = [...nodes]
  compactSelection(nodeIds, nodes).forEach(nodeId => {
    const node = getNode(nodeId, next)
    if (!node || node.system || node.parentId === RECYCLE_ID) return
    next = next.map(item => item.id === node.id ? { ...item, originalParentId: item.parentId, parentId: RECYCLE_ID, deletedAt: Date.now(), updatedAt: Date.now() } : item)
  })
  saveVfs(next)
}

export function restoreNodes(nodeIds: string[]) {
  const nodes = loadVfs()
  let next = [...nodes]
  compactSelection(nodeIds, nodes).forEach(nodeId => {
    const node = getNode(nodeId, next)
    if (!node || node.parentId !== RECYCLE_ID) return
    const target = node.originalParentId && getNode(node.originalParentId, next)?.kind === 'folder' ? node.originalParentId : ROOT_ID
    const clean = uniqueName(target, node.name, next.filter(item => item.id !== node.id))
    next = next.map(item => item.id === node.id ? { ...item, parentId: target, name: clean, deletedAt: undefined, originalParentId: undefined, updatedAt: Date.now() } : item)
  })
  saveVfs(next)
}

export function deletePermanently(nodeIds: string[]) {
  const nodes = loadVfs()
  const remove = new Set<string>()
  compactSelection(nodeIds, nodes).forEach(nodeId => collectDescendants(nodeId, nodes, remove))
  const remaining = nodes.filter(node => !remove.has(node.id) || node.system)
  cleanupRemovedAssets(nodes.filter(node => remove.has(node.id)), remaining)
  saveVfs(remaining)
}

export function emptyRecycleBin() {
  const nodes = loadVfs()
  const remove = new Set<string>()
  listChildren(RECYCLE_ID, nodes).forEach(node => collectDescendants(node.id, nodes, remove))
  const remaining = nodes.filter(node => !remove.has(node.id))
  cleanupRemovedAssets(nodes.filter(node => remove.has(node.id)), remaining)
  saveVfs(remaining)
}

export function ancestors(nodeId: string, nodes = loadVfs()) {
  const result: VfsNode[] = []
  let cursor = getNode(nodeId, nodes)
  while (cursor) {
    result.unshift(cursor)
    cursor = cursor.parentId ? getNode(cursor.parentId, nodes) : null
  }
  return result
}

export function nodePath(nodeId: string, nodes = loadVfs()) {
  return ancestors(nodeId, nodes).map(node => node.id === ROOT_ID ? 'C:' : node.id === RECYCLE_ID ? 'Recycle Bin' : node.name).join('\\')
}

export function resolvePath(path: string, cwdId = ROOT_ID, nodes = loadVfs()) {
  const raw = path.trim().replace(/\//g, '\\')
  if (!raw || raw === '.') return getNode(cwdId, nodes)
  if (raw === '..') {
    const cwd = getNode(cwdId, nodes)
    return cwd?.parentId ? getNode(cwd.parentId, nodes) : cwd
  }
  let current = /^c:/i.test(raw) || raw.startsWith('\\') ? getNode(ROOT_ID, nodes) : getNode(cwdId, nodes)
  const parts = raw.replace(/^c:\\?/i, '').split('\\').filter(Boolean)
  for (const part of parts) {
    if (part === '.') continue
    if (part === '..') {
      current = current?.parentId ? getNode(current.parentId, nodes) : current
      continue
    }
    if (!current) return null
    current = nodes.find(node => node.parentId === current?.id && node.name.toLowerCase() === part.toLowerCase()) ?? null
  }
  return current
}

export function searchVfs(query: string, nodes = loadVfs()) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return nodes.filter(node => node.id !== ROOT_ID && node.id !== RECYCLE_ID && node.parentId !== RECYCLE_ID && !isDescendant(node.id, RECYCLE_ID, nodes) && (node.name.toLowerCase().includes(q) || (node.kind === 'text' && node.content?.toLowerCase().includes(q))))
}

export function ensureNotesFile() {
  const nodes = loadVfs()
  const documents = getNode('documents', nodes)
  if (!documents) return createTextFile(ROOT_ID, 'Notes.txt')
  const existing = nodes.find(node => node.parentId === documents.id && node.name.toLowerCase() === 'notes.txt' && node.kind === 'text')
  return existing ?? createTextFile(documents.id, 'Notes.txt')
}

export function storageStats(nodes = loadVfs()) {
  const encoded = JSON.stringify(nodes).length
  const items = nodes.filter(node => !node.system && node.parentId !== RECYCLE_ID && !isDescendant(node.id, RECYCLE_ID, nodes)).length
  const recycle = listChildren(RECYCLE_ID, nodes).length
  return { bytes: encoded, items, recycle }
}

export function isDescendant(candidateId: string, parentId: string, nodes = loadVfs()) {
  let cursor = getNode(candidateId, nodes)
  while (cursor?.parentId) {
    if (cursor.parentId === parentId) return true
    cursor = getNode(cursor.parentId, nodes)
  }
  return false
}

function collectDescendants(nodeId: string, nodes: VfsNode[], set: Set<string>) {
  const node = getNode(nodeId, nodes)
  if (!node || node.system) return
  set.add(nodeId)
  listChildren(nodeId, nodes).forEach(child => collectDescendants(child.id, nodes, set))
}

function compactSelection(nodeIds: string[], nodes: VfsNode[]) {
  const unique = [...new Set(nodeIds)]
  return unique.filter(nodeId => !unique.some(otherId => otherId !== nodeId && isDescendant(nodeId, otherId, nodes)))
}

function storeExternalAssetWithFallback(assetKey: string, value: string) {
  void putAsset(assetKey, value).catch(() => {
    try {
      const nodes = loadVfs()
      saveVfs(nodes.map(node => node.assetKey === assetKey ? { ...node, content: value, assetKey: undefined } : node))
    } catch {
      // If both IndexedDB and localStorage are unavailable, the metadata remains but the browser cannot retain the binary asset.
    }
  })
}

function cleanupRemovedAssets(removed: VfsNode[], remaining: VfsNode[]) {
  const stillReferenced = new Set(remaining.map(node => node.assetKey).filter((key): key is string => Boolean(key)))
  const keys = new Set(removed.map(node => node.assetKey).filter((key): key is string => Boolean(key)))
  keys.forEach(key => { if (!stillReferenced.has(key)) void deleteAsset(key).catch(() => undefined) })
}

function sanitizeName(name: string) {
  return name.replace(/[<>:"/\\|?*]/g, '').trim().slice(0, 100) || 'Untitled'
}

function uniqueName(parentId: string, requested: string, nodes: VfsNode[]) {
  const names = new Set(nodes.filter(node => node.parentId === parentId).map(node => node.name.toLowerCase()))
  if (!names.has(requested.toLowerCase())) return requested
  const dot = requested.lastIndexOf('.')
  const hasExtension = dot > 0
  const base = hasExtension ? requested.slice(0, dot) : requested
  const extension = hasExtension ? requested.slice(dot) : ''
  let index = 2
  while (names.has(`${base} (${index})${extension}`.toLowerCase())) index += 1
  return `${base} (${index})${extension}`
}
