# LuxOS Desktop 1.0 — Mega Update

This build combines the planned v0.5 through v1.0 desktop milestones into one large upgrade.

## Major changes

- `C:\Desktop` now drives real desktop files and folders.
- Drag LuxOS files between File Explorer and the desktop.
- Drag files from your real computer onto the LuxOS desktop to import them.
- Recycle Bin with restore, permanent delete, and Empty Recycle Bin.
- Copy / Cut / Paste shared between Explorer and the desktop.
- Keyboard shortcuts on the desktop and in Explorer: Ctrl+A, Ctrl+C, Ctrl+X, Ctrl+V, Delete, F2, Enter.
- Multi-select in File Explorer and on the desktop.
- File associations: folders -> Explorer, text -> Notes, images -> Photo Viewer, audio -> Media Player.
- Multiple independent Explorer, Notes, Browser, Terminal, and Photo Viewer windows.
- Taskbar grouping with window counts and grouped thumbnail previews.
- Global Start search across programs and LuxOS files.
- Photo Viewer with previous/next, zoom, rotate, set-as-wallpaper and delete.
- Lux Paint with brush size/color and Save to Pictures.
- Calculator.
- Media Player with an actual Music library and audio import.
- Expanded Terminal commands for copy, move, rename, open, recycle and empty-bin operations.
- Custom account name and account picture.
- Desktop icon-size options and optional seconds in the taskbar clock.
- Existing LuxOS 0.3/0.4 settings and VFS data migrate forward automatically where possible.
- Hybrid localStorage + IndexedDB media persistence for much larger imported images/audio.

## Hybrid browser storage

LuxOS remains a static GitHub Pages web app, but the Mega Update now uses a hybrid storage model: virtual-disk metadata and small text content stay in localStorage while larger image/audio assets are moved into IndexedDB automatically. Existing v0.4 inline media continues to load. Media imports use a 20 MB per-file safety limit in this build. Custom wallpapers can also be selected up to 20 MB and are automatically downscaled/compressed before being stored in settings. Account pictures remain limited to 1 MB.

## Upgrade from v0.4

1. Back up your repo or commit your current working version.
2. Copy this build over your existing LuxOS project and replace matching files.
3. Keep your existing `package-lock.json` if you already have one.
4. Run:

```powershell
npm install
npm run build
npm run dev
```

5. If the build succeeds, commit and push through GitHub Desktop.

Suggested commit message:

`Build LuxOS Desktop 1.0 Mega Update`

## First things to test

1. Log in.
2. Right-click the desktop -> New folder / New text document.
3. Open Computer -> Desktop and confirm the same items exist there.
4. Drag a file from Explorer to the desktop.
5. Delete it, open Recycle Bin, then restore it.
6. Open several Computer and Terminal windows to test taskbar grouping.
7. Search for a file by name from Start.
8. Import an image -> open it in Photo Viewer -> set it as wallpaper.
9. Draw in Lux Paint -> Save to Pictures -> open Gallery.
10. Import a small audio file into Media Player.
11. Refresh the browser and confirm the desktop/files/settings persist.
12. Try a larger image as a wallpaper and confirm LuxOS optimizes it before saving.


## Storage and security note

LuxOS is still a static browser application. Its virtual disk, settings, account picture and imported media are stored in that browser profile on that device (localStorage + IndexedDB); they are not automatically synced to GitHub or another computer. The Windows-style sign-in screen is an interface/session experience, not a secure server-side authentication boundary.

## Patch contents

Copy the contents of this patch folder over your existing LuxOS v0.4 repository and replace matching files. The new `src/system/assetStore.ts` file must be added. Your existing GitHub Pages workflow, TypeScript config, Vite config, `public/lux-mark.svg`, and `package-lock.json` can remain in place.

The old `MIGRATION.md`, `V0.3_UPGRADE.md`, and `V0.4_UPGRADE.md` files are historical documentation only and may be deleted after upgrading if you want a cleaner repo.
