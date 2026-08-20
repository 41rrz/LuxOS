import { Glyph } from '../components/Glyph'
import type { AppId, LuxApp } from './types'

export const apps: LuxApp[] = [
  { id: 'lux', name: 'Lux', subtitle: 'LuxOS Home', icon: <Glyph id="lux" />, className: 'icon-lux', desktop: true, pinned: true, width: 790, height: 540 },
  { id: 'files', name: 'Computer', subtitle: 'File Explorer', icon: <Glyph id="files" />, className: 'icon-files', desktop: true, pinned: true, multiInstance: true, width: 900, height: 600 },
  { id: 'gallery', name: 'Gallery', subtitle: 'Pictures & artwork', icon: <Glyph id="gallery" />, className: 'icon-gallery', desktop: true, width: 820, height: 570 },
  { id: 'projects', name: 'Projects', subtitle: 'Lux workspace', icon: <Glyph id="projects" />, className: 'icon-projects', desktop: true, width: 820, height: 560 },
  { id: 'notes', name: 'Notes', subtitle: 'Text editor', icon: <Glyph id="notes" />, className: 'icon-notes', multiInstance: true, width: 700, height: 530 },
  { id: 'browser', name: 'Browser', subtitle: 'Lux Browser', icon: <Glyph id="browser" />, className: 'icon-browser', pinned: true, multiInstance: true, width: 900, height: 610 },
  { id: 'terminal', name: 'Terminal', subtitle: 'LuxOS Command Shell', icon: <Glyph id="terminal" />, className: 'icon-terminal', pinned: true, multiInstance: true, width: 760, height: 500 },
  { id: 'themes', name: 'Personalize', subtitle: 'Themes & appearance', icon: <Glyph id="themes" />, className: 'icon-themes', width: 780, height: 560 },
  { id: 'settings', name: 'Control Panel', subtitle: 'System settings', icon: <Glyph id="settings" />, className: 'icon-settings', desktop: true, width: 800, height: 570 },
  { id: 'recycle', name: 'Recycle Bin', subtitle: 'Deleted files', icon: <Glyph id="recycle" />, className: 'icon-recycle', desktop: true, width: 820, height: 560 },
  { id: 'imageViewer', name: 'Photo Viewer', subtitle: 'View pictures', icon: <Glyph id="imageViewer" />, className: 'icon-image', multiInstance: true, hiddenFromStart: true, width: 820, height: 620 },
  { id: 'calculator', name: 'Calculator', subtitle: 'Standard calculator', icon: <Glyph id="calculator" />, className: 'icon-calculator', width: 360, height: 500 },
  { id: 'paint', name: 'Lux Paint', subtitle: 'Draw & sketch', icon: <Glyph id="paint" />, className: 'icon-paint', width: 860, height: 620 },
  { id: 'media', name: 'Media Player', subtitle: 'Music & audio', icon: <Glyph id="media" />, className: 'icon-media', width: 720, height: 520 },
]

export const appById = Object.fromEntries(apps.map(app => [app.id, app])) as Record<AppId, LuxApp>
export const desktopApps = apps.filter(app => app.desktop)
export const pinnedApps = apps.filter(app => app.pinned)
export const startApps = apps.filter(app => !app.hiddenFromStart)
