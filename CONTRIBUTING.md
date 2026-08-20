# Contributing to QuickToss

## Prerequisites

- **Node.js 20 or newer** (CI builds on the current LTS, Node 24)
- npm

## Getting started

```bash
git clone https://github.com/killerwolf/QuickToss.git
cd QuickToss
npm install
npm run dev
```

`npm run dev` starts Vite on port 3000 and launches Electron once it's ready, with hot reload for the renderer and DevTools open.

## Project layout

```
electron/          Electron main process
  main.ts          Window, IPC handlers, folder scanning, update check
  preload.ts       contextBridge API exposed to the renderer
src/               React renderer
  components/      UI components
  App.tsx          Screen state machine (welcome / viewing / completed)
  types.ts         Shared renderer types
  electron.d.ts    Renderer-side typing of window.electronAPI
assets/            App icon source (icon.svg) and generated formats
scripts/           Build tooling
docs/              Product docs (PRD, user flow, logo brief)
```

The renderer never touches the filesystem directly — everything goes through IPC handlers registered in `electron/main.ts` and exposed via `electron/preload.ts`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite + Electron with hot reload |
| `npm run build` | Build the renderer (Vite) and compile the main process (tsc) |
| `npm run pack` | Build, then package unpacked into `release/` (fast sanity check) |
| `npm run dist` | Build and package installers without publishing |
| `npm run build:mac` | Build and package for macOS |
| `npm run build:icons` | Regenerate all icon formats from `assets/icon.svg` |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Re-run tests as files change |
| `npm run test:coverage` | Run tests with a coverage report |
| `npm run typecheck` | Typecheck the renderer, main process, and tests |
| `npm run lint` | Biome lint |
| `npm run check` | Biome lint + format check |
| `npm run check:fix` | Apply Biome fixes |

## Code style

Formatting and linting are handled by [Biome](https://biomejs.dev). CI runs `npm run lint` and `npm run check` as **blocking** steps, so run `npm run check:fix` before pushing.

## Tests

Tests run on [Vitest](https://vitest.dev) with Testing Library, in a jsdom environment. Test files sit next to the code they cover as `*.test.ts` / `*.test.tsx`, and CI runs them as a blocking step.

```bash
npm test              # once
npm run test:watch    # while developing
```

Coverage is partial by design — the suite currently covers file-type classification, the formatting helpers, and the update notifier. Extending it is tracked in [#9](https://github.com/killerwolf/QuickToss/issues/9); good next targets are the undo stack and settings persistence.

Logic worth testing should live outside `electron/main.ts`, which instantiates the app at import time and can't be loaded from a test. `electron/file-types.ts` is the pattern to follow: pure functions the main process calls, importable on their own.

Note that `tsconfig.main.json` excludes `*.test.ts` so tests never end up in the packaged app; `tsconfig.test.json` typechecks them instead.

## Icons

The icon has a single source of truth: `assets/icon.svg` (1024×1024). After editing it:

```bash
npm run build:icons
```

This rasterizes the SVG with sharp and generates `icon.icns` (macOS), `icon.ico` (Windows), and the PNG sizes, writing them into `assets/`. Commit the generated files along with the SVG.

Avoid putting text in the icon — it's unreadable at 16–32px, and macOS already shows the app name under the icon.

## Releasing

Releases are built and published by GitHub Actions ([.github/workflows/release.yml](.github/workflows/release.yml)) — never from a local machine. Pushing a tag is the whole process:

```bash
git checkout main && git pull
git tag v1.5.0
git push origin v1.5.0
```

CI then builds both macOS architectures (x64 + arm64), publishes a GitHub release with the `.dmg`/`.zip` assets, and uploads `latest-mac.yml` for update checks.

**Release candidates.** A tag containing a semver prerelease suffix publishes as a GitHub *prerelease* instead:

```bash
git tag v1.5.0-rc.1
git push origin v1.5.0-rc.1
```

Prereleases are skipped by the in-app update check, so they won't be advertised to people running a stable version.

Publishing uses the `GITHUB_TOKEN` that Actions provides automatically — no personal access token needed.

Pull requests run lint, format check, and a packaging smoke test, but never publish.

## Known constraint: unsigned builds

QuickToss isn't signed with an Apple Developer ID or notarized, which has two consequences:

1. macOS shows a *"QuickToss.app is damaged"* warning on first launch; users have to run `xattr -cr /Applications/QuickToss.app`.
2. Automatic in-place updates can't work. Squirrel.Mac rejects the downloaded bundle's signature on arm64, and on x64 electron-updater can't even read a signature for the running app. The app therefore only *checks* for updates and links to the release page.

Both are tracked in [#7](https://github.com/killerwolf/QuickToss/issues/7). If you're debugging update behavior, the app writes a log to `~/Library/Logs/QuickToss/auto-updater.log`.

## Platform support

macOS is the only platform currently built and released. `package.json` still carries Windows (nsis) and Linux (AppImage) build config, but CI doesn't produce those artifacts and they're untested — see [#11](https://github.com/killerwolf/QuickToss/issues/11).

## Pull requests

1. Branch off `main`.
2. Make your change, and run `npm run check:fix` and `npm run build`.
3. Open a PR describing what changed and how you verified it.
