import { Glyph } from '../components/Glyph'
import type { AppId, LuxApp } from './types'

export const apps: LuxApp[] = [
  { id: 'lux', name: 'Lux', subtitle: 'LuxOS Home', icon: <Glyph id="lux" />, className: 'icon-lux', desktop: true, pinned: true, width: 760, height: 520 },
  { id: 'files', name: 'Computer', subtitle: 'File Explorer', icon: <Glyph id="files" />, className: 'icon-files', desktop: true, pinned: true, width: 820, height: 560 },
  { id: 'gallery', name: 'Gallery', subtitle: 'Pictures & artwork', icon: <Glyph id="gallery" />, className: 'icon-gallery', desktop: true, width: 780, height: 550 },
  { id: 'projects', name: 'Projects', subtitle: 'Lux workspace', icon: <Glyph id="projects" />, className: 'icon-projects', desktop: true, width: 800, height: 540 },
  { id: 'notes', name: 'Notes', subtitle: 'Local notes', icon: <Glyph id="notes" />, className: 'icon-notes', width: 650, height: 500 },
  { id: 'browser', name: 'Browser', subtitle: 'Lux Browser', icon: <Glyph id="browser" />, className: 'icon-browser', pinned: true, width: 860, height: 590 },
  { id: 'terminal', name: 'Terminal', subtitle: 'LuxOS Command Shell', icon: <Glyph id="terminal" />, className: 'icon-terminal', pinned: true, width: 720, height: 480 },
  { id: 'themes', name: 'Personalize', subtitle: 'Themes & appearance', icon: <Glyph id="themes" />, className: 'icon-themes', width: 720, height: 520 },
  { id: 'settings', name: 'Control Panel', subtitle: 'System settings', icon: <Glyph id="settings" />, className: 'icon-settings', desktop: true, width: 760, height: 540 },
]

export const appById = Object.fromEntries(apps.map(app => [app.id, app])) as Record<AppId, LuxApp>
export const desktopApps = apps.filter(app => app.desktop)
export const pinnedApps = apps.filter(app => app.pinned)
