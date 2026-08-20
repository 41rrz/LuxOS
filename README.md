# LuxOS Desktop 0.4

LuxOS is a browser-based desktop environment built with React, TypeScript and Vite. Version 0.4 turns the desktop shell into something you can actually use: a persistent virtual disk, File Explorer operations, imported pictures, filesystem-aware Notes and Terminal commands, custom wallpaper, notifications, Aero Peek, taskbar pin reordering and smoother window transitions.

## 0.4 highlights

- Persistent LuxOS virtual filesystem stored in the browser
- Real File Explorer navigation and breadcrumbs
- Create folders and text documents
- Rename and delete virtual files/folders
- Import text files and images
- Edit text documents directly from Explorer
- Gallery reads imported images from Pictures storage
- Notes now lives at `C:\Documents\Notes.txt`
- Terminal commands operate on the same filesystem
- `DIR`, `CD`, `PWD`, `TYPE`, `MKDIR`, `TOUCH`, `DEL` and output redirection
- Custom wallpaper upload
- Aero Peek when hovering Show Desktop
- Notification Center in the system tray
- Draggable/reorderable pinned taskbar apps
- Recently used apps in Start
- Open, restore, minimize and close window animations
- Automatic migration of v0.3 desktop settings/layout into v0.4
- Existing v0.3 snap, Alt+Tab, taskbar previews, desktop dragging and tray controls remain

## Run locally

```powershell
npm install
npm run dev
```

## Production test

```powershell
npm run build
```

The generated static site is written to `dist/`.

## GitHub Pages

The included `.github/workflows/deploy-pages.yml` builds and deploys LuxOS with GitHub Actions. Keep your existing `package-lock.json` committed. The dependency set is unchanged from 0.3, so an existing lockfile can remain in the repository.

## Storage notes

LuxOS 0.4 stores its virtual filesystem in browser storage. For this preview, imported files are limited to about 1.5 MB each. The exact total available space depends on the browser. Files in LuxOS are local to that browser/profile and are not uploaded to GitHub.

LuxOS is a web desktop, not a real operating system. Login credentials are intentionally cosmetic in this preview.
