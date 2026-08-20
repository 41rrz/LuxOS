# LuxOS Desktop v0.2

LuxOS is a desktop-style browser operating system experience built with React, TypeScript and Vite.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## GitHub Pages

The included `.github/workflows/deploy-pages.yml` workflow builds and deploys the `dist` folder whenever `main` is pushed.

In GitHub, set **Settings → Pages → Source** to **GitHub Actions**.

## Interaction

- Double-click desktop icons to open apps.
- Drag windows by their title bars.
- Double-click a title bar to maximize/restore.
- Use the title-bar buttons to minimize, maximize and close.
- Right-click the desktop for a desktop context menu.
- Start menu provides apps, search, lock, restart and shutdown.
- Notes and appearance settings persist in local browser storage.

The login password field is visual only in this preview. A static GitHub Pages frontend is not a secure authentication system.
