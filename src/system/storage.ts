import type { LuxSettings } from './types'

const SETTINGS_KEY = 'luxos.desktop.settings.v2'
const NOTES_KEY = 'luxos.notes.v2'

export const defaultSettings: LuxSettings = {
  accent: 'violet',
  glassIntensity: 72,
  reduceMotion: false,
  showDesktopLabels: true,
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

export function resetLuxStorage() {
  localStorage.removeItem(SETTINGS_KEY)
  localStorage.removeItem(NOTES_KEY)
}
