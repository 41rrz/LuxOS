import type { AppId, DesktopPosition, LuxSettings, WindowLayoutEntry } from './types'

const SETTINGS_KEY = 'luxos.desktop.settings.v5'
const DESKTOP_POSITIONS_KEY = 'luxos.desktop.positions.v5'
const WINDOW_LAYOUT_KEY = 'luxos.window.layout.v5'
const PINNED_ORDER_KEY = 'luxos.taskbar.pins.v5'
const LEGACY_SETTINGS_KEYS = ['luxos.desktop.settings.v4', 'luxos.desktop.settings.v3']
const LEGACY_DESKTOP_KEYS = ['luxos.desktop.positions.v4', 'luxos.desktop.positions.v3']
const LEGACY_WINDOW_KEYS = ['luxos.window.layout.v4', 'luxos.window.layout.v3']

export const defaultSettings: LuxSettings = {
  accent: 'violet',
  wallpaper: 'aurora',
  glassIntensity: 78,
  reduceMotion: false,
  showDesktopLabels: true,
  systemSounds: true,
  masterVolume: 58,
  userName: 'Lux',
  desktopIconSize: 'medium',
  showSeconds: false,
}

function firstLegacy(keys: string[]) {
  for (const key of keys) {
    const value = localStorage.getItem(key)
    if (value) return value
  }
  return null
}

export function loadSettings(): LuxSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY) || firstLegacy(LEGACY_SETTINGS_KEYS) || '{}'
    const parsed = JSON.parse(raw) as Partial<LuxSettings>
    const migrated: LuxSettings = { ...defaultSettings, ...parsed }
    if (!localStorage.getItem(SETTINGS_KEY)) saveSettings(migrated)
    return migrated
  } catch {
    return defaultSettings
  }
}

export function saveSettings(settings: LuxSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadDesktopPositions(): Record<string, DesktopPosition> {
  try {
    const raw = localStorage.getItem(DESKTOP_POSITIONS_KEY) || firstLegacy(LEGACY_DESKTOP_KEYS) || '{}'
    const parsed = JSON.parse(raw) as Record<string, DesktopPosition>
    if (!localStorage.getItem(DESKTOP_POSITIONS_KEY)) saveDesktopPositions(parsed)
    return parsed
  } catch {
    return {}
  }
}

export function saveDesktopPositions(value: Record<string, DesktopPosition>) {
  localStorage.setItem(DESKTOP_POSITIONS_KEY, JSON.stringify(value))
}

export function loadWindowLayout(): Partial<Record<AppId, WindowLayoutEntry>> {
  try {
    const raw = localStorage.getItem(WINDOW_LAYOUT_KEY) || firstLegacy(LEGACY_WINDOW_KEYS) || '{}'
    const parsed = JSON.parse(raw) as Partial<Record<AppId, WindowLayoutEntry>>
    if (!localStorage.getItem(WINDOW_LAYOUT_KEY)) saveWindowLayout(parsed)
    return parsed
  } catch {
    return {}
  }
}

export function saveWindowLayout(value: Partial<Record<AppId, WindowLayoutEntry>>) {
  localStorage.setItem(WINDOW_LAYOUT_KEY, JSON.stringify(value))
}

export function loadPinnedOrder(defaultOrder: AppId[]): AppId[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PINNED_ORDER_KEY) || '[]') as AppId[]
    const valid = parsed.filter(id => defaultOrder.includes(id))
    return [...valid, ...defaultOrder.filter(id => !valid.includes(id))]
  } catch {
    return defaultOrder
  }
}

export function savePinnedOrder(order: AppId[]) {
  localStorage.setItem(PINNED_ORDER_KEY, JSON.stringify(order))
}

export function resetLuxStorage() {
  localStorage.removeItem(SETTINGS_KEY)
  localStorage.removeItem(DESKTOP_POSITIONS_KEY)
  localStorage.removeItem(WINDOW_LAYOUT_KEY)
  localStorage.removeItem(PINNED_ORDER_KEY)
  LEGACY_SETTINGS_KEYS.forEach(key => localStorage.removeItem(key))
  LEGACY_DESKTOP_KEYS.forEach(key => localStorage.removeItem(key))
  LEGACY_WINDOW_KEYS.forEach(key => localStorage.removeItem(key))
}
