# LuxOS Changelog

## 0.4.0 — Virtual Disk

### Desktop shell
- Added Aero Peek from the Show Desktop strip.
- Added open, restore, minimize and close window motion states.
- Added Notification Center and notification badge in the system tray.
- Added drag-to-reorder taskbar pins with persistent ordering.
- Added recently used applications to the Start menu.
- Added custom wallpaper support.
- Migrates v0.3 appearance, icon position and window geometry settings automatically.

### Filesystem
- Added a persistent LuxOS virtual disk (`C:`).
- Added Desktop, Documents, Pictures, Projects, Downloads and Lux Archive directories.
- File Explorer can navigate folders, create folders, create text files, rename, delete and search.
- File Explorer can import text and image files from the host computer.
- Added text/image preview pane and inline text editing.
- Gallery now reads images stored in the virtual filesystem.
- Notes is backed by `C:\Documents\Notes.txt`.
- Terminal now operates on the same filesystem with navigation and file commands.

### Existing 0.3 features retained
- Window snapping and snap preview.
- Alt+Tab window switcher.
- Taskbar thumbnail previews.
- Persistent window geometry.
- Draggable desktop shortcuts and selection rectangle.
- Network/volume flyouts and system sounds.
