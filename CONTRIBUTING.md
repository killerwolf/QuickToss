# Contributing to QuickToss

## Prerequisites

- **Rust (stable)** — install via [rustup](https://rustup.rs)
- **Xcode Command Line Tools** — `xcode-select --install`
- macOS 12 or newer

## Getting started

```bash
git clone https://github.com/killerwolf/QuickToss.git
cd QuickToss/app
cargo run
```

The first build takes a few minutes — GPUI is a large dependency tree — and every one after that is seconds.

## Project layout

```
app/                   The application (Rust)
  src/
    main.rs            Entry point: window, key bindings, menu
    app.rs             State, screen machine, and what a decision does
    ui.rs              Every screen's rendering
    session.rs         The queue, the tallies, and the undo stack
    files.rs           Scanning, file kinds, trash, formatting
    preview.rs         Text loading and the Quick Look bridge
    settings.rs        Settings persistence
    sound.rs           The two decision sounds, synthesised
    update.rs          The "a newer version exists" check
assets/                App icon source (icon.svg) and generated formats
scripts/               Build tooling (bundling, icons, release notes)
docs/                  Product docs (PRD, user flow, logo brief) and ADRs
site/                  Landing page, deployed to GitHub Pages
```

There is no process boundary and no IPC: `files::scan_folder` is a function that returns a `Vec<FileItem>`. Work that blocks — scanning, trashing, Quick Look, the update check — runs on GPUI's background executor and comes back to the view to be committed. See [ADR 0002](docs/adr/0002-gpui-instead-of-electron.md) for why the app is built this way.

## Commands

All of these run from `app/`.

| Command | What it does |
| --- | --- |
| `cargo run` | Build and launch |
| `cargo test` | Run the test suite |
| `cargo clippy --all-targets` | Lint |
| `cargo fmt` | Format |
| `cargo build --release` | Optimised build |

And from the repository root:

| Command | What it does |
| --- | --- |
| `scripts/bundle.sh` | Assemble `dist/QuickToss.app` |
| `scripts/bundle.sh --dmg` | ...and the `.dmg` that ships it |
| `scripts/build-icons.sh` | Regenerate icon formats from `assets/icon.svg` |

## Code style

`cargo fmt` and `cargo clippy` are the whole story. CI runs `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings` as **blocking** steps, so run both before pushing.

## Tests

Tests live in `#[cfg(test)]` modules beside the code they cover, and CI runs them as a blocking step.

Coverage is partial by design. It covers the session state machine (keep / toss / undo), settings persistence including reading files written by the old Electron build, folder scanning and file classification, the size formatter, version comparison, and the sound synthesis staying inside its headroom. Extending it is tracked in [#9](https://github.com/killerwolf/QuickToss/issues/9).

`preview.rs` tests the Quick Look bridge against real files it writes to a temp directory, so `QLThumbnailGenerator` is genuinely exercised rather than mocked — including that a missing file fails rather than hanging. Those tests need macOS, which is what CI runs on.

Logic worth testing should stay out of `ui.rs` and off `QuickToss` itself. `session.rs`, `files.rs`, `settings.rs` and `update.rs` are the pattern to follow: plain functions and plain data, with no `Window` or `Context` in sight, so a test can call them directly.

## Icons

The icon has a single source of truth: `assets/icon.svg` (1024×1024). After editing it:

```bash
scripts/build-icons.sh
```

This rasterises the SVG and regenerates `icon.icns` and the PNG sizes into `assets/`. Commit the generated files along with the SVG.

Avoid putting text in the icon — it's unreadable at 16–32px, and macOS already shows the app name under the icon.

## Releasing

Releases are built and published by GitHub Actions ([.github/workflows/release.yml](.github/workflows/release.yml)) — never from a local machine. Pushing a tag is the whole process:

```bash
git checkout main && git pull
git tag v2.0.0
git push origin v2.0.0
```

CI builds both architectures into one universal binary, wraps it in a `.dmg`, and publishes a GitHub release with the notes taken from that version's `CHANGELOG.md` section.

**Release candidates.** A tag containing a semver prerelease suffix publishes as a GitHub *prerelease* instead:

```bash
git tag v2.0.0-rc.1
git push origin v2.0.0-rc.1
```

The in-app update check reads the *latest* release, so prereleases aren't advertised to people running a stable version.

Publishing uses the `GITHUB_TOKEN` that Actions provides automatically — no personal access token needed.

Pull requests run lint, format check, tests, and a bundle build, but never publish.

## Known constraint: GPUI is pre-1.0

GPUI publishes as `gpui-pre-*` snapshots of Zed's main branch and makes breaking changes between versions. The app depends on [GPUI Kit](https://gpui-kit.com), which pins a matching set of those crates and provides the component layer, so upgrading means moving `gpui-kit` as a unit rather than chasing individual crates. Expect an upgrade to need code changes, and read GPUI Kit's release notes first.

## Known constraint: no video playback

GPUI has no video element, and the one third-party player depends on GStreamer being installed system-wide. Video files show the poster frame Quick Look produces, and `O` opens them in QuickTime. Improving on this — a scrubbable filmstrip from `AVAssetImageGenerator` is the obvious next step — is tracked in [#12](https://github.com/killerwolf/QuickToss/issues/12).

## Known constraint: unsigned builds

QuickToss is signed ad-hoc, not with an Apple Developer ID, and isn't notarized. macOS therefore shows a *"QuickToss.app is damaged"* warning on first launch, and users have to run `xattr -cr /Applications/QuickToss.app` once.

This also rules out safe in-place updates, so the app only *checks* for a newer version and links to the release page. Both are tracked in [#7](https://github.com/killerwolf/QuickToss/issues/7).

## Platform support

macOS is the only platform built and released. GPUI itself supports Windows and Linux, but `preview.rs` leans on QuickLookThumbnailing for everything it can't decode natively, so those platforms need a preview backend of their own before they'd be worth shipping — see [#11](https://github.com/killerwolf/QuickToss/issues/11).

## Pull requests

1. Branch off `main`.
2. Make your change, and run `cargo fmt`, `cargo clippy --all-targets`, and `cargo test`.
3. Open a PR describing what changed and how you verified it.
