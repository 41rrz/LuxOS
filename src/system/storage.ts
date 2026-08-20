import type { AppId, DesktopPosition, LuxSettings, WindowLayoutEntry } from './types'

const SETTINGS_KEY = 'luxos.desktop.settings.v4'
const DESKTOP_POSITIONS_KEY = 'luxos.desktop.positions.v4'
const WINDOW_LAYOUT_KEY = 'luxos.window.layout.v4'
const PINNED_ORDER_KEY = 'luxos.taskbar.pins.v4'
const LEGACY_SETTINGS_KEY = 'luxos.desktop.settings.v3'
const LEGACY_DESKTOP_POSITIONS_KEY = 'luxos.desktop.positions.v3'
const LEGACY_WINDOW_LAYOUT_KEY = 'luxos.window.layout.v3'

export const defaultSettings: LuxSettings = {
  accent: 'violet',
  wallpaper: 'aurora',
  glassIntensity: 78,
  reduceMotion: false,
  showDesktopLabels: true,
  systemSounds: true,
  masterVolume: 58,
}

export function loadSettings(): LuxSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY) || localStorage.getItem(LEGACY_SETTINGS_KEY) || '{}'
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

export function loadDesktopPositions(): Partial<Record<AppId, DesktopPosition>> {
  try {
    const raw = localStorage.getItem(DESKTOP_POSITIONS_KEY) || localStorage.getItem(LEGACY_DESKTOP_POSITIONS_KEY) || '{}'
    const parsed = JSON.parse(raw) as Partial<Record<AppId, DesktopPosition>>
    if (!localStorage.getItem(DESKTOP_POSITIONS_KEY)) saveDesktopPositions(parsed)
    return parsed
  } catch {
    return {}
  }
}

export function saveDesktopPositions(value: Partial<Record<AppId, DesktopPosition>>) {
  localStorage.setItem(DESKTOP_POSITIONS_KEY, JSON.stringify(value))
}

export function loadWindowLayout(): Partial<Record<AppId, WindowLayoutEntry>> {
  try {
    const raw = localStorage.getItem(WINDOW_LAYOUT_KEY) || localStorage.getItem(LEGACY_WINDOW_LAYOUT_KEY) || '{}'
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
  localStorage.removeItem(LEGACY_SETTINGS_KEY)
  localStorage.removeItem(LEGACY_DESKTOP_POSITIONS_KEY)
  localStorage.removeItem(LEGACY_WINDOW_LAYOUT_KEY)
}
