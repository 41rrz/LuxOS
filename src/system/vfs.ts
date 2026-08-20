export type VfsKind = 'folder' | 'text' | 'image'

export interface VfsNode {
  id: string
  name: string
  kind: VfsKind
  parentId: string | null
  content?: string
  mime?: string
  createdAt: number
  updatedAt: number
}

const VFS_KEY = 'luxos.vfs.v4'
const ROOT_ID = 'root'

function id(prefix = 'node') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function initialNodes(): VfsNode[] {
  const now = Date.now()
  const folders = [
    ['desktop', 'Desktop'],
    ['documents', 'Documents'],
    ['pictures', 'Pictures'],
    ['projects', 'Projects'],
    ['downloads', 'Downloads'],
    ['archive', 'Lux Archive'],
  ] as const
  return [
    { id: ROOT_ID, name: 'LuxOS (C:)', kind: 'folder', parentId: null, createdAt: now, updatedAt: now },
    ...folders.map(([folderId, name]) => ({ id: folderId, name, kind: 'folder' as const, parentId: ROOT_ID, createdAt: now, updatedAt: now })),
    { id: 'welcome-txt', name: 'Welcome.txt', kind: 'text', parentId: 'documents', content: 'Welcome to LuxOS 0.4.\n\nThis file lives inside the LuxOS virtual filesystem.\nCreate folders, edit text files, import images, and use the Terminal to explore the same storage.', createdAt: now, updatedAt: now },
    { id: 'notes-txt', name: 'Notes.txt', kind: 'text', parentId: 'documents', content: '', createdAt: now, updatedAt: now },
    { id: 'readme-txt', name: 'README.txt', kind: 'text', parentId: 'projects', content: 'Lux Projects\n\nUse this folder as a home for project notes and files.', createdAt: now, updatedAt: now },
  ]
}

function normalize(nodes: VfsNode[]) {
  if (!nodes.some(node => node.id === ROOT_ID)) return initialNodes()
  return nodes
}

export function loadVfs(): VfsNode[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(VFS_KEY) || 'null') as VfsNode[] | null
    const nodes = parsed && Array.isArray(parsed) ? normalize(parsed) : initialNodes()
    if (!parsed) saveVfs(nodes)
    return nodes
  } catch {
    const nodes = initialNodes()
    saveVfs(nodes)
    return nodes
  }
}

export function saveVfs(nodes: VfsNode[]) {
  try {
    localStorage.setItem(VFS_KEY, JSON.stringify(nodes))
  } catch {
    throw new Error('LuxOS virtual storage is full. Delete a few imported files and try again.')
  }
}

export function resetVfs() {
  localStorage.removeItem(VFS_KEY)
  return loadVfs()
}

export function rootId() { return ROOT_ID }

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

export function importFile(parentId: string, file: File, content: string) {
  const nodes = loadVfs()
  const kind: VfsKind = file.type.startsWith('image/') ? 'image' : 'text'
  const clean = uniqueName(parentId, sanitizeName(file.name || (kind === 'image' ? 'Image' : 'Document.txt')), nodes)
  const now = Date.now()
  const node: VfsNode = { id: id(kind), name: clean, kind, parentId, content, mime: file.type || (kind === 'image' ? 'image/*' : 'text/plain'), createdAt: now, updatedAt: now }
  saveVfs([...nodes, node])
  return node
}

export function updateText(nodeId: string, content: string) {
  const nodes = loadVfs().map(node => node.id === nodeId ? { ...node, content, updatedAt: Date.now() } : node)
  saveVfs(nodes)
}

export function renameNode(nodeId: string, name: string) {
  const nodes = loadVfs()
  const node = getNode(nodeId, nodes)
  if (!node || node.id === ROOT_ID) return
  const clean = uniqueName(node.parentId ?? ROOT_ID, sanitizeName(name || node.name), nodes.filter(item => item.id !== nodeId))
  saveVfs(nodes.map(item => item.id === nodeId ? { ...item, name: clean, updatedAt: Date.now() } : item))
}

export function deleteNode(nodeId: string) {
  if (nodeId === ROOT_ID) return
  const nodes = loadVfs()
  const remove = new Set<string>([nodeId])
  let changed = true
  while (changed) {
    changed = false
    nodes.forEach(node => {
      if (node.parentId && remove.has(node.parentId) && !remove.has(node.id)) {
        remove.add(node.id)
        changed = true
      }
    })
  }
  saveVfs(nodes.filter(node => !remove.has(node.id)))
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
  return ancestors(nodeId, nodes).map(node => node.id === ROOT_ID ? 'C:' : node.name).join('\\')
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
  return nodes.filter(node => node.id !== ROOT_ID && (node.name.toLowerCase().includes(q) || (node.kind === 'text' && node.content?.toLowerCase().includes(q))))
}

export function ensureNotesFile() {
  const nodes = loadVfs()
  const documents = nodes.find(node => node.id === 'documents') ?? nodes.find(node => node.name === 'Documents' && node.kind === 'folder')
  if (!documents) return createTextFile(ROOT_ID, 'Notes.txt')
  const existing = nodes.find(node => node.parentId === documents.id && node.name.toLowerCase() === 'notes.txt' && node.kind === 'text')
  return existing ?? createTextFile(documents.id, 'Notes.txt')
}

function sanitizeName(name: string) {
  return name.replace(/[<>:"/\\|?*]/g, '').trim().slice(0, 80) || 'Untitled'
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
