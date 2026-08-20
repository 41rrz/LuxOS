# LuxOS

LuxOS is a browser-based mobile operating system experience built with React, TypeScript, and Vite.

## Local development

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open the local address shown by Vite.

## Production build

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

1. Create a new GitHub repository named `LuxOS` (or any name you want).
2. Push this project to the `main` branch.
3. In the repository, open **Settings → Pages**.
4. Set **Source** to **GitHub Actions**.
5. Push a commit or run the included **Deploy LuxOS to GitHub Pages** workflow manually.

The included Vite config uses relative asset paths so a project-site repository works without hard-coding the repository name.

## v0.1 foundation

- Boot sequence
- Lock screen
- Live clock/date
- Home screen and glass dock
- Long-press edit mode
- Drag-to-reorder icons in edit mode
- App launch/close animation
- Control Center
- Settings app
- Notes with local persistence
- Theme/accent customization
- PWA manifest + service worker
- GitHub Pages deployment workflow

## Next milestones

- Real multi-page home screen
- Widgets
- Folders
- App switcher
- Notification center
- Wallpapers gallery
- LuxOS Store / app registry loader
- Better touch drag physics
- Sound/haptics layer
- Custom icon builder
