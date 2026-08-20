import type { ReactNode } from 'react'

export type AppId =
  | 'lux'
  | 'gallery'
  | 'notes'
  | 'projects'
  | 'files'
  | 'browser'
  | 'themes'
  | 'terminal'
  | 'settings'

export type Accent = 'violet' | 'blue' | 'pink' | 'orange' | 'green'

export interface LuxApp {
  id: AppId
  name: string
  subtitle: string
  icon: ReactNode
  className: string
  dock?: boolean
}

export interface LuxSettings {
  accent: Accent
  reduceMotion: boolean
  glassIntensity: number
  showLabels: boolean
}
