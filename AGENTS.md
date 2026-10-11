# Repository Guidelines

## Project Overview

Personal macOS-inspired desktop simulation in the browser ("Between Us"). React 19 + Vite 5 app recreating Finder, Terminal, Safari, Music, Photos, Mail, Settings as draggable glassmorphism windows. Static GitHub Pages architecture — no backend, no runtime upload. See `PRODUCT.md` for the product contract (restrained macOS-like feel, honest controls, no fake affordances, WCAG AA baseline).

## Architecture & Data Flow

- Boot flow: `src/main.jsx` (ReactDOM root) → `src/App.jsx` gates `IntroScreen` → `BootScreen` → locked desktop (`LockScreen` overlay + `Desktop` shell).
- Providers nest `Theme > DisplaySettings > WindowManager` around `AppContent`.
- `Desktop` is a pure shell (wallpaper + brightness overlay) hosting `MenuBar`, `WindowList` → `AppWindow` list, `Dock`, ambient audio/lyric overlays, `ContextMenu`.
- Window management: reducer in `src/core/providers/WindowManagerProvider.jsx` (`OPEN/CLOSE/MINIMIZE/MAXIMIZE/FOCUS`, z-index 100–9499) exposing `openApp` API.
- App content dispatch: `src/utils/renderAppContent.jsx` lazy-switches per window id (plus `preview:` id branch for photo previews).
- Cross-feature communication: React context props + `window` CustomEvents (e.g. `between-us:lock`, `gallery-ambient-*`) + `openApp` payloads + shared pure `*Model.js` modules + `localStorage` keys (e.g. `theme`, `photos-favorites`, `between-us.music.*`).
- Per-feature layout: `src/features/<app>/` holds `<App>Content.jsx`, `*Model.js` (pure logic), hooks (`use*.js`), subcomponents. Static content in `src/content/` (music LRC/wasm/covers, photos via `import.meta.glob`).
- Icons/assets: Vite glob resolvers (`src/assets/resolveIcon.js`, `src/assets/paths.js` with `APP_ICONS`/light/fallback tables).

## Key Directories

- `src/core/` — providers (`WindowManager/Theme/DisplaySettings`), `constants/` (apps registry, positions, wallpapers), `hooks/` (`useContextMenu`, `useMobileCheck`).
- `src/windows/` — `Desktop.jsx`, `WindowList.jsx`, `Dock.jsx`, `AppWindow/` (drag/resize/zoom shell + `WindowContext`).
- `src/ui/` — `IntroScreen/` (Three.js heart stage), `BootScreen/`, `LockScreen/` (+ `loginLock.js` demo password), `ContextMenu/`.
- `src/features/` — one folder per app: `finder/`, `terminal/`, `safari/`, `music/`, `photos/` (catalog + Drive merge + local favorites hook), `mail/` (incl. `mailCrypto.js`, `mailLock.js`), `settings/`, `menubar/`, `calendar/`, `notes/`, `calculator/`.
- `src/utils/` — `renderAppContent.jsx`, `search.js` (case-insensitive substring), `performance.js` (`useDebounce`).
- `src/content/` — music assets, photos sections (subfolder = section).
- `tests/` + `tests/testUtils/` — test suites + shared helpers.

## Development Commands

```bash
npm install        # install (resyncs stale lockfile: lock lists react-window + @vitejs/plugin-react absent from package.json)
npm run dev        # Vite HMR dev server (open:false, HMR overlay off)
npm start          # alias of dev
npm run build      # prod build: base /between-us/, esbuild minify, treeshake, no sourcemap, drops console/debugger
npm run preview    # serve prod build on :4173 with security headers (local check only)
npm test           # node --test, auto-discovers tests/*.test.js + src/**/*.test.js
IMPORTANT_PWD=... npm run encrypt:mail  # re-encrypt private/mail.json -> public/important-mail.enc.json
```

## Code Conventions & Common Patterns

- `@` alias → `/src` (see `vite.config.js`); SCSS uses `@use` with `modern-compiler` API.
- Feature modules: `Content.jsx` (UI) + `*Model.js` (pure, testable functions) + `use*.js` (hook wiring). Example: `photos/photoLibraryModel.js` (pure section merge) + `photos/usePhotoLibrary.js` (Drive + local state).
- `// ponytail:` comments mark deliberate simplifications with their ceiling/upgrade path — respect them, don't "fix" into abstractions.
- State: provider state for global (windows, theme, brightness); `useState` + `localStorage` persistence per feature; `window` CustomEvents for decoupled cross-app signals.
- Formatting: JSX + SCSS, BEM-ish class names (`photos-card__favorite--active`, `menuBar__dropdownItem`). No eslint/prettier config — match surrounding style.
- Async: plain promises + `useEffect` fetches (Drive API); no data-fetching library.
- Error handling: fail-soft fallbacks (e.g. reduced-motion/no-WebGL intro fallback boots anyway; corrupt storage → empty defaults, session still works).

## Important Files

- Entry: `index.html` (%BASE_URL% assets, three@0.160 importmap), `src/main.jsx`, `src/App.jsx`.
- Config: `vite.config.js` (base per mode, 9 manualChunks incl. per-feature splits, hashed assets, lockscreen-wallpaper inlining), `package.json`, `public/manifest.json` (installable manifest only, no service worker), `public/.htaccess` (static-host headers/compression).
- Key modules: `src/core/providers/WindowManagerProvider.jsx`, `src/core/constants/apps.jsx`, `src/utils/renderAppContent.jsx`, `src/features/photos/photoCatalog.js` (+ `drivePhotos.js`, `driveConfig.js`), `src/features/mail/mailCrypto.js`.
- Docs: `PRODUCT.md` (contract + anti-references), `README.md` (setup + deploy), `docs/DRIVE_PHOTOS_SETUP.md` (Drive folder + `VITE_DRIVE_API_KEY`/`DRIVE_FOLDER_ID`), `docs/photo-gallery-architecture.md`, `private/README.md` (mail workflow), `intro-preview.html` (standalone non-Vite intro prototype).

## Dev Documents Policy

- Working documents produced during development (audits, inventories, scratch notes, local templates/examples) are local-only: NEVER commit or push them. They will be deleted when no longer needed.
- Examples: `AUDIT-IDENTITAS.md` (identity audit), `private/favorites.example.json` (local template), `untitled.md`, `lockscreen-reference.html`, `interview/`, `docs/superpowers/`.
- Keep them out of git via `.gitignore` (see the `# Dev/working documents (local only)` group); use `git rm --cached <file>` if one was already tracked — the disk copy stays, only tracking is removed.
- Exceptions (committed docs): `PRODUCT.md`, `README.md`, `docs/DRIVE_PHOTOS_SETUP.md`, `docs/photo-gallery-architecture.md`, `private/README.md`, `private/mail.example.json` — these are maintained project docs, not scratch work. When in doubt, ask before committing a new doc file.

## Runtime/Tooling Preferences

- Node + npm (`package-lock.json`, lockfileVersion 3). CI pins Node 20; Vite 5 needs Node 18+. No engines/nvmrc/volta/bun files — don't introduce Bun.
- React 19, `react-icons`, `sass`, `happy-dom` (tests), `@vitejs/plugin-react-swc`.
- Deploy: pushes to `code-root` branch (NOT `main`) trigger `.github/workflows/deploy.yml` → `npm ci` → build with `VITE_DRIVE_API_KEY` secret → `gh-pages` orphan branch via peaceiris action.

## Testing & QA

- Zero-dependency QA: `node:test` + `node:assert/strict` only. No vitest/jest/coverage/eslint. React 19 `act` + `createRoot` for rendering; `happy-dom` Window as DOM; `vite.createServer({middlewareMode:true})` + `ssrLoadModule()` per file to load JSX; `sass.compile` for style tests.
- Layout: `tests/*.test.js` (14 files; `*Integration.test.js` = multi-component, e.g. `PhotosPreviewIntegration.test.js`, `AppLockIntegration.test.js`), 4 helpers in `tests/testUtils/` (`harness.js` happy-dom setup, `dom.js` act-wrapped events, `waitForCondition.js` 2s/10ms polling, `clock.js` fake timers), plus 1 co-located `src/styles/components/Safari/SafariPages.test.js`.
- Canonical per-file boilerplate: top-level `setupHarness()`; `before` starts vite middleware server + imports React/act/modules; `afterEach` drains `mountedRoots[]` + clears body/`localStorage`; `after` closes vite + window. Mutations inside `await act(async => ...)`. Probe pattern exfiltrates hook state to data-attrs.
- No coverage thresholds, no CI test gate (deploy workflow is build-only). Run `npm test` locally; keep new tests deterministic and isolated.
