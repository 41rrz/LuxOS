import { Glyph } from '../components/Glyph'
import type { AppId, LuxApp } from './types'

export const apps: LuxApp[] = [
  { id: 'lux', name: 'Lux', subtitle: 'Your Lux hub', icon: <Glyph id="lux" />, className: 'icon-lux' },
  { id: 'gallery', name: 'Gallery', subtitle: 'Artwork and media', icon: <Glyph id="gallery" />, className: 'icon-gallery' },
  { id: 'notes', name: 'Notes', subtitle: 'Local notes', icon: <Glyph id="notes" />, className: 'icon-notes' },
  { id: 'projects', name: 'Projects', subtitle: 'Everything in progress', icon: <Glyph id="projects" />, className: 'icon-projects' },
  { id: 'files', name: 'Files', subtitle: 'LuxOS storage', icon: <Glyph id="files" />, className: 'icon-files' },
  { id: 'browser', name: 'Browser', subtitle: 'Open the web', icon: <Glyph id="browser" />, className: 'icon-browser', dock: true },
  { id: 'themes', name: 'Themes', subtitle: 'Personalize LuxOS', icon: <Glyph id="themes" />, className: 'icon-themes' },
  { id: 'terminal', name: 'Terminal', subtitle: 'LuxOS command shell', icon: <Glyph id="terminal" />, className: 'icon-terminal', dock: true },
  { id: 'settings', name: 'Settings', subtitle: 'System preferences', icon: <Glyph id="settings" />, className: 'icon-settings', dock: true },
]

export const appById = Object.fromEntries(apps.map(app => [app.id, app])) as Record<AppId, LuxApp>
export const homeAppIds = apps.filter(app => !app.dock).map(app => app.id)
export const dockAppIds = ['browser', 'terminal', 'settings'] as AppId[]
