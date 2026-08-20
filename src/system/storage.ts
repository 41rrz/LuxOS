import type { AppId, LuxSettings } from './types'

const SETTINGS_KEY = 'luxos.settings.v1'
const ORDER_KEY = 'luxos.home.order.v1'
const NOTES_KEY = 'luxos.notes.v1'

export const defaultSettings: LuxSettings = {
  accent: 'violet',
  reduceMotion: false,
  glassIntensity: 72,
  showLabels: true,
}

export function loadSettings(): LuxSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
    return { ...defaultSettings, ...saved }
  } catch {
    return defaultSettings
  }
}

export function saveSettings(settings: LuxSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadOrder(fallback: AppId[]): AppId[] {
  try {
    const saved = JSON.parse(localStorage.getItem(ORDER_KEY) || '[]') as AppId[]
    const valid = saved.filter(id => fallback.includes(id))
    const missing = fallback.filter(id => !valid.includes(id))
    return [...valid, ...missing]
  } catch {
    return fallback
  }
}

export function saveOrder(order: AppId[]) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(order))
}

export function loadNotes() {
  return localStorage.getItem(NOTES_KEY) || ''
}

export function saveNotes(value: string) {
  localStorage.setItem(NOTES_KEY, value)
}

export function resetLuxStorage() {
  localStorage.removeItem(SETTINGS_KEY)
  localStorage.removeItem(ORDER_KEY)
  localStorage.removeItem(NOTES_KEY)
}
