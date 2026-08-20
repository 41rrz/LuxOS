# Converting LuxOS v0.1 Mobile Shell → LuxOS Desktop v0.2

This build is intentionally a structural rewrite. It keeps the React/Vite foundation but replaces the mobile OS interaction model with a desktop session and window manager.

## Replace these files

Copy these v0.2 files over the matching files in the current repository:

- `src/App.tsx`
- `src/styles.css`
- `src/apps/AppContent.tsx`
- `src/components/Glyph.tsx`
- `src/system/apps.tsx`
- `src/system/storage.ts`
- `src/system/types.ts`
- `src/main.tsx`
- `src/vite-env.d.ts`
- `public/lux-mark.svg`
- `public/manifest.webmanifest`
- `public/sw.js`
- `index.html`
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `.github/workflows/deploy-pages.yml`
- `README.md`

`package.json` is included too, but v0.2 intentionally keeps the same React/Vite dependency set as v0.1. If your current `package-lock.json` was produced from that package file, keep it.

## Remove old mobile-only code

The v0.2 `App.tsx` no longer uses the old mobile `AppIcon` component. You can delete:

- `src/components/AppIcon.tsx`

It is safe to leave it temporarily; Vite will not bundle an unused file.

## Do not delete package-lock.json

Your repository already has a generated `package-lock.json`. Keep it. The v0.2 Pages workflow uses `npm install`, so the deployment also remains tolerant if the lockfile is temporarily absent.

## New session flow

`boot → login → welcome → desktop → lock/restart/shutdown`

The old flow was:

`boot → mobile lock screen → home screen → full-screen app layer`

## New desktop architecture

- Desktop shortcuts launch apps by double-click.
- Apps run inside independent windows.
- Windows can be dragged, resized, minimized, maximized and closed.
- The taskbar tracks pinned and running apps.
- Start menu provides program search and power/session controls.
- Right-clicking the desktop opens a context menu.
- The system clock opens a calendar panel.
- Notes and appearance settings persist through localStorage.

## Login password note

The password field is intentionally visual in v0.2. GitHub Pages is a static frontend and cannot provide secure authentication by itself. Real accounts should be added later with an authentication backend/provider rather than storing passwords in JavaScript or localStorage.
