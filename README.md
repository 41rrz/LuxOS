# LuxOS Desktop

LuxOS is a browser-based desktop environment designed around a Windows 7-era desktop workflow with a modern Lux glass visual identity.

The **1.0 Mega Update** combines the desktop, virtual filesystem, Recycle Bin, grouped taskbar, multi-window apps, Start search, Photo Viewer, Paint, Calculator, Media Player, Terminal, personalization and PWA shell into one build.

## Run locally

```powershell
npm install
npm run dev
```

## Production build

```powershell
npm run build
```

## GitHub Pages

The included `.github/workflows/deploy-pages.yml` builds and deploys the Vite `dist` directory automatically on pushes to `main`.

See `MEGA_UPDATE.md` for the full feature list and upgrade instructions.

## Local data

LuxOS keeps its virtual disk and preferences in the current browser profile. Large image/audio data is stored through IndexedDB, while metadata and smaller settings use localStorage.
