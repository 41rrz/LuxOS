import type { ReactNode } from 'react'

export type AppId = 'lux' | 'files' | 'gallery' | 'notes' | 'projects' | 'browser' | 'themes' | 'terminal' | 'settings'
export type Accent = 'violet' | 'blue' | 'pink' | 'orange' | 'green'
export type Wallpaper = 'aurora' | 'midnight' | 'sunset'
export type SessionStage = 'boot' | 'login' | 'welcome' | 'desktop' | 'shutdown'

export interface LuxSettings {
  accent: Accent
  wallpaper: Wallpaper
  glassIntensity: number
  reduceMotion: boolean
  showDesktopLabels: boolean
  systemSounds: boolean
  masterVolume: number
}

export interface LuxApp {
  id: AppId
  name: string
  subtitle: string
  icon: ReactNode
  className: string
  desktop?: boolean
  pinned?: boolean
  width: number
  height: number
}

export interface WindowState {
  id: number
  appId: AppId
  x: number
  y: number
  width: number
  height: number
  z: number
  minimized: boolean
  maximized: boolean
  restore?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface DesktopPosition {
  x: number
  y: number
}

export interface WindowLayoutEntry {
  x: number
  y: number
  width: number
  height: number
  maximized: boolean
}
