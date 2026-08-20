import type { AppId, DesktopPosition, LuxSettings, WindowLayoutEntry } from './types'

const SETTINGS_KEY = 'luxos.desktop.settings.v3'
const NOTES_KEY = 'luxos.notes.v3'
const DESKTOP_POSITIONS_KEY = 'luxos.desktop.positions.v3'
const WINDOW_LAYOUT_KEY = 'luxos.window.layout.v3'

export const defaultSettings: LuxSettings = {
  accent: 'violet',
  wallpaper: 'aurora',
  glassIntensity: 76,
  reduceMotion: false,
  showDesktopLabels: true,
  systemSounds: true,
  masterVolume: 58,
}

export function loadSettings(): LuxSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') as Partial<LuxSettings>
    return { ...defaultSettings, ...parsed }
  } catch {
    return defaultSettings
  }
}

export function saveSettings(settings: LuxSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadNotes() {
  return localStorage.getItem(NOTES_KEY) || ''
}

export function saveNotes(value: string) {
  localStorage.setItem(NOTES_KEY, value)
}

export function loadDesktopPositions(): Partial<Record<AppId, DesktopPosition>> {
  try {
    return JSON.parse(localStorage.getItem(DESKTOP_POSITIONS_KEY) || '{}') as Partial<Record<AppId, DesktopPosition>>
  } catch {
    return {}
  }
}

export function saveDesktopPositions(value: Partial<Record<AppId, DesktopPosition>>) {
  localStorage.setItem(DESKTOP_POSITIONS_KEY, JSON.stringify(value))
}

export function loadWindowLayout(): Partial<Record<AppId, WindowLayoutEntry>> {
  try {
    return JSON.parse(localStorage.getItem(WINDOW_LAYOUT_KEY) || '{}') as Partial<Record<AppId, WindowLayoutEntry>>
  } catch {
    return {}
  }
}

export function saveWindowLayout(value: Partial<Record<AppId, WindowLayoutEntry>>) {
  localStorage.setItem(WINDOW_LAYOUT_KEY, JSON.stringify(value))
}

export function resetLuxStorage() {
  localStorage.removeItem(SETTINGS_KEY)
  localStorage.removeItem(NOTES_KEY)
  localStorage.removeItem(DESKTOP_POSITIONS_KEY)
  localStorage.removeItem(WINDOW_LAYOUT_KEY)
}
