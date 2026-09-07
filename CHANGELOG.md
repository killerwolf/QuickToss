# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

Downloads for every release are on the
[releases page](https://github.com/killerwolf/QuickToss/releases).

## [Unreleased]

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
