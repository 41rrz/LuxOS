# LuxOS Desktop — Product Plan

## Identity

LuxOS should feel like an alternate desktop operating system from the late-Aero era, rebuilt with modern Lux visual language. The goal is not to clone Windows 7 pixel-for-pixel. The interaction hierarchy is familiar: boot, sign in, desktop, Start menu, taskbar, windows, Control Panel. The materials, lighting, icons, transitions and apps belong to LuxOS.

Core visual mix:

- dark blue / violet atmospheric desktop
- restrained Aero-like translucent chrome
- glossy dimensional app icons
- bright edge reflections and soft bloom
- compact Segoe-style typography
- practical desktop density rather than oversized mobile UI

## Screen-by-screen flow

### 01 — Boot

Purpose: establish LuxOS before any UI appears.

Elements:
- Lux orb + LuxOS Desktop wordmark
- four-dot startup activity indicator
- extremely dark background with faint violet bloom
- optional future boot sound

Exit: automatically advances to Sign In.

### 02 — Sign In

Purpose: Windows 7-inspired account selection and sign-in moment.

Elements:
- LuxOS wordmark in upper-left
- centered framed user avatar
- account name `Lux`
- password field + arrow action
- Switch user action
- clock/date in lower-left
- accessibility, network and power buttons in lower-right
- shutdown/restart flyout

Behavior:
- Enter or arrow starts sign in
- password field is visual only until real backend authentication exists

### 03 — Welcome

Purpose: hide desktop initialization and make login feel deliberate.

Elements:
- smaller account avatar
- `Welcome`
- animated activity dots
- `Preparing your desktop...`

Exit: fades into Desktop.

### 04 — Desktop

Purpose: primary LuxOS workspace.

Elements:
- Lux Aurora wallpaper
- desktop shortcuts in upper-left
- taskbar at bottom
- no phone frame, dock or mobile page dots

Core interactions:
- single-click selects desktop icon
- double-click launches app
- right-click opens desktop context menu
- windows overlap normally
- focused window comes to front

### 05 — Start Menu

Purpose: central launcher and system session menu.

Layout:
- account card at top
- installed program list on left
- search field at bottom-left
- Documents / Pictures / Projects / Control Panel on right
- Lock and shutdown controls at bottom

Future:
- recently used apps
- pinned favorites
- search across projects/files
- user-editable shortcuts

### 06 — Windows

Purpose: make every LuxOS app feel like software rather than a webpage modal.

Window chrome:
- translucent title bar
- small app icon + title
- minimize / maximize / close
- File / Edit / View / Help menu strip
- resize grip

Window behavior:
- drag title bar
- double-click title bar to maximize/restore
- resize from bottom-right
- minimize to taskbar
- one running window per app in v0.2

Future window manager:
- snap left/right
- multiple windows per app
- taskbar thumbnails
- Alt+Tab
- cascading/tiled arrangements
- saved positions across sessions

### 07 — Taskbar

Purpose: persistent application and system navigation.

Elements:
- glowing Lux Start orb
- pinned apps
- running app buttons
- hidden-icons chevron
- network
- volume
- clock/date
- show-desktop strip

Future:
- hover thumbnails
- progress bars
- notification badges
- context menus / jump lists

### 08 — Calendar / Clock Flyout

Purpose: recreate desktop-system utility behavior.

Elements:
- large current time
- full formatted date
- current month grid
- today highlight

Future:
- events
- reminders
- clock/timezone settings

### 09 — Desktop Context Menu

Purpose: make empty desktop space interactive.

Initial actions:
- View
- Refresh
- New
- Personalize
- Screen resolution

Future:
- icon size
- auto arrange
- sort by
- create folder/text file
- wallpaper actions

### 10 — Computer / File Explorer

Purpose: familiar place for LuxOS content.

Initial design:
- sidebar with Favorites and Libraries
- breadcrumb/address field
- search field
- folders
- local disk meter

Future:
- virtual filesystem backed by IndexedDB
- drag/drop imports
- folder creation
- image previews
- downloadable/exportable files
- project-aware folders

### 11 — Lux Hub

Purpose: branded home application.

Content:
- welcome hero
- Projects / Gallery / Computer shortcuts
- edition, version and runtime information

Future:
- release notes
- project activity
- GitHub status
- personal dashboard widgets

### 12 — Projects

Purpose: surface all Lux projects in one place.

Future:
- project cards
- screenshots
- GitHub links
- build status
- downloads
- changelogs

### 13 — Gallery

Purpose: visual portfolio/media browser.

Future:
- folders/albums
- image viewer window
- metadata
- custom CD artwork collection
- drag/drop upload into browser storage

### 14 — Notes

Purpose: simple persistent native-feeling utility.

Current:
- desktop text editor shell
- autosave to localStorage

Future:
- multiple files
- rich text
- export
- File Explorer integration

### 15 — Lux Browser

Purpose: browser-themed utility inside the OS.

Constraint:
- external sites often block embedding, so results open in another browser tab for now.

Future:
- curated LuxOS start page
- bookmarks
- history
- internal app URLs (`lux://projects`, etc.)

### 16 — Terminal

Purpose: power-user and easter-egg surface.

Initial commands:
- help
- ver
- whoami
- date
- echo
- clear / cls

Future:
- launch apps by command
- file commands against virtual filesystem
- theme commands
- developer commands

### 17 — Personalization

Purpose: own the visual language.

Current:
- Lux Aurora wallpaper preview
- violet / blue / pink / orange / green accents

Future:
- uploaded wallpapers
- Aero tint color
- transparency
- icon themes
- sound schemes
- cursor themes

### 18 — Control Panel

Purpose: conventional system configuration hub.

Current:
- appearance shortcut
- glass intensity
- reduce motion
- desktop labels
- reset browser-stored LuxOS data

Future categories:
- System
- Accounts
- Personalization
- Sound
- Mouse
- Taskbar & Start Menu
- Date & Time
- Privacy
- About LuxOS

### 19 — Lock / Log Off

Purpose: return from desktop to account screen without page reload.

Behavior:
- clear open desktop windows for v0.2
- return to sign-in screen

Future:
- lock preserves running windows
- log off closes session
- multiple local profiles

### 20 — Shutdown / Restart

Shutdown:
- transition to a dark LuxOS shutdown screen
- website remains open because browser tabs cannot actually power off the computer

Restart:
- clear active desktop session
- replay LuxOS boot sequence

## Development roadmap

### v0.2 — Desktop conversion
- desktop login/session flow
- desktop icons
- window manager
- Start menu
- taskbar
- context menu
- clock/calendar
- core app shells

### v0.3 — Window manager polish
- snapping
- taskbar previews
- Alt+Tab
- window persistence
- animation/sound pass

### v0.4 — Virtual filesystem
- IndexedDB storage
- Explorer navigation
- imports and exports
- Gallery and Notes integration

### v0.5 — Personalization system
- user wallpapers
- accent/glass presets
- icon packs
- sound schemes
- login avatar customization

### v0.6 — Lux project platform
- project profiles
- GitHub integrations
- releases/downloads
- portfolio mode

### v1.0 — Public LuxOS
- onboarding
- accessibility pass
- touch fallback
- offline/PWA polish
- performance optimization
- full QA across desktop browsers
