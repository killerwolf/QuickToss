# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

Downloads for every release are on the
[releases page](https://github.com/killerwolf/QuickToss/releases).

## [Unreleased]

## [2.0.0] - 2026-09-10

QuickToss is now a native Rust app built on [GPUI](https://gpui.rs) rather than an
Electron app. Everything you do with it works the way it did — the same screens, the
same keys, the same Trash-not-delete safety — but the app around that got a great deal
smaller and the previews got better. [ADR 0002](docs/adr/0002-gpui-instead-of-electron.md)
records the reasoning.

### Changed

- **The download is about 6 MB instead of 110 MB**, and one universal file instead of a
  separate one per Mac. Installed, the app is 13 MB where it used to be 341 MB. There's
  no longer a copy of Chromium in there.
- **Previews come from macOS itself now.** Word, PowerPoint, Excel and RTF files get a
  real preview for the first time, PDFs and HEIC photos render the way they do in
  Finder, and it's the same renderer behind the space-bar preview you already know.
  Five JavaScript libraries that each approximated one of those formats are gone.
- The window follows your Mac's light or dark appearance instead of always being light.
- Which folder you're working through is now shown while you work through it.
- Messages that used to stop the app with an alert box — an empty folder, a file that
  wouldn't move — are now a line along the bottom you can read and ignore.

### Added

- **`O` opens the current file** in whatever app owns it. Anything QuickToss can't draw
  is now one keystroke from the app that can.

### Removed

- **Video no longer plays.** Video files show their poster frame, and `O` opens them in
  QuickTime. GPUI has no video element, and the only third-party option requires
  GStreamer installed system-wide. This is a real loss, and it's tracked in
  [#37](https://github.com/killerwolf/QuickToss/issues/37).
- The **Video Autoplay** setting, which no longer has anything to control. Your other
  two settings carry over untouched.

## [1.5.0] - 2026-09-07

### Changed

- The PDF viewer is no longer part of the initial bundle — it loads the first time
  you actually open a PDF, so the app starts faster for everyone who never previews one.
- The app icon fills more of its canvas, so it reads better at Dock and Finder sizes.

### Fixed

- A file that fails to move to the Trash is no longer counted as tossed. The failure
  was swallowed, so the file stayed on disk while the summary claimed it was gone —
  now the session leaves it in place and tells you what happened.

## [1.4.0] - 2026-08-20

### Fixed

- When a new version is available, QuickToss now tells you and links to the release
  page. Previously it tried to install the update itself and failed, because
  installing in place needs the code signing tracked in
  [#7](https://github.com/killerwolf/QuickToss/issues/7).
- Updater diagnostics now survive a restart. The log directory wasn't being created,
  so nothing was written to it.

## [1.3.0] - 2026-08-20

### Added

- Release-candidate tags (`v1.3.0-rc.1`) publish as GitHub prereleases, which the
  updater ignores — so a candidate build no longer reaches everyone's install.

### Fixed

- Update failures are surfaced in the UI instead of failing silently, and the
  auto-updater writes diagnostics to a log file.

## [1.2.0] - 2026-08-20

### Changed

- New app icon: a stack of cards mid-swipe.

### Fixed

- The icon build script ran but produced nothing usable.

## [1.1.0] - 2026-08-20

### Added

- QuickToss checks for a newer version on launch and tells you when one exists.

## [1.0.0] - 2026-08-20

### Added

- Separate Intel (`x64`) and Apple Silicon (`arm64`) builds, so each Mac gets a
  native binary instead of one architecture running under translation.

## [0.9.0] - 2025-09-24

### Added

- First release. Pick a folder, then swipe or key through it one file at a time —
  left to toss, right to keep. Previews for images, PDFs, plain-text formats and
  video; `Cmd+Z` undoes any decision; tossed files go to the system Trash.

[Unreleased]: https://github.com/killerwolf/QuickToss/compare/v1.5.0...HEAD
[1.5.0]: https://github.com/killerwolf/QuickToss/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/killerwolf/QuickToss/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/killerwolf/QuickToss/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/killerwolf/QuickToss/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/killerwolf/QuickToss/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/killerwolf/QuickToss/compare/v0.9.0...v1.0.0
[0.9.0]: https://github.com/killerwolf/QuickToss/releases/tag/v0.9.0
