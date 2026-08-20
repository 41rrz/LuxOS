import type { ReactNode } from 'react'

export type AppId =
  | 'lux'
  | 'files'
  | 'gallery'
  | 'notes'
  | 'projects'
  | 'browser'
  | 'themes'
  | 'terminal'
  | 'settings'
  | 'recycle'
  | 'imageViewer'
  | 'calculator'
  | 'paint'
  | 'media'

export type Accent = 'violet' | 'blue' | 'pink' | 'orange' | 'green'
export type Wallpaper = 'aurora' | 'midnight' | 'sunset' | 'custom'
export type SessionStage = 'boot' | 'login' | 'welcome' | 'desktop' | 'shutdown'
export type WindowMotion = 'opening' | 'restoring' | 'minimizing' | 'closing'

export interface LuxSettings {
  accent: Accent
  wallpaper: Wallpaper
  customWallpaper?: string
  glassIntensity: number
  reduceMotion: boolean
  showDesktopLabels: boolean
  systemSounds: boolean
  masterVolume: number
  userName: string
  userAvatar?: string
  desktopIconSize: 'small' | 'medium' | 'large'
  showSeconds: boolean
}

export interface LuxApp {
  id: AppId
  name: string
  subtitle: string
  icon: ReactNode
  className: string
  desktop?: boolean
  pinned?: boolean
  multiInstance?: boolean
  hiddenFromStart?: boolean
  width: number
  height: number
}

export interface LaunchData {
  nodeId?: string
  folderId?: string
  title?: string
  source?: string
}

export interface WindowState {
  id: number
  appId: AppId
  launch?: LaunchData
  title?: string
  x: number
  y: number
  width: number
  height: number
  z: number
  minimized: boolean
  maximized: boolean
  motion?: WindowMotion
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

export interface ClipboardState {
  mode: 'copy' | 'cut'
  nodeIds: string[]
}
