import type { PointerEvent as ReactPointerEvent } from 'react'
import type { LuxApp } from '../system/types'

interface Props {
  app: LuxApp
  editMode?: boolean
  showLabel?: boolean
  onOpen: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onLongPress?: () => void
  onPointerDownEdit?: (event: ReactPointerEvent<HTMLButtonElement>) => void
}

export function AppIcon({ app, editMode, showLabel = true, onOpen, onLongPress, onPointerDownEdit }: Props) {
  let timer = 0
  let longPressed = false

  const start = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (editMode) {
      onPointerDownEdit?.(event)
      return
    }
    longPressed = false
    timer = window.setTimeout(() => {
      longPressed = true
      onLongPress?.()
    }, 520)
  }

  const end = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (timer) window.clearTimeout(timer)
    if (!editMode && !longPressed) onOpen(event)
  }

  return (
    <button
      className={`app-icon-button ${editMode ? 'is-editing' : ''}`}
      data-app-id={app.id}
      aria-label={`Open ${app.name}`}
      onPointerDown={start}
      onPointerUp={end}
      onPointerCancel={() => timer && window.clearTimeout(timer)}
      onContextMenu={event => event.preventDefault()}
    >
      <span className={`app-icon ${app.className}`}>
        <span className="app-icon-shine" />
        <span className="app-icon-glyph">{app.icon}</span>
      </span>
      {showLabel && <span className="app-label">{app.name}</span>}
      {editMode && <span className="edit-dot" aria-hidden="true">−</span>}
    </button>
  )
}
