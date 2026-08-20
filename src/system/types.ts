import type { ReactNode } from 'react'

export type AppId = 'lux' | 'files' | 'gallery' | 'notes' | 'projects' | 'browser' | 'themes' | 'terminal' | 'settings'
export type Accent = 'violet' | 'blue' | 'pink' | 'orange' | 'green'
export type SessionStage = 'boot' | 'login' | 'welcome' | 'desktop' | 'shutdown'

export interface LuxSettings {
  accent: Accent
  glassIntensity: number
  reduceMotion: boolean
  showDesktopLabels: boolean
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
