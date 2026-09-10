# QuickToss

Clean out a cluttered folder the way you'd swipe through a dating app: one file at a time, left to toss, right to keep.

<p align="center">
  <a href="https://github.com/killerwolf/QuickToss/releases/latest"><img alt="latest release" src="https://img.shields.io/github/v/release/killerwolf/QuickToss"></a>
  <a href="https://github.com/killerwolf/QuickToss/releases"><img alt="total downloads" src="https://img.shields.io/github/downloads/killerwolf/QuickToss/total"></a>
  <a href="https://github.com/killerwolf/QuickToss/actions/workflows/release.yml"><img alt="build status" src="https://github.com/killerwolf/QuickToss/actions/workflows/release.yml/badge.svg"></a>
  <a href="https://github.com/killerwolf/QuickToss/blob/main/LICENSE"><img alt="licence: MIT" src="https://img.shields.io/github/license/killerwolf/QuickToss"></a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/killerwolf/QuickToss/main/.github/assets/screenshot.png" width="820" alt="QuickToss on the first of eight files in a folder: an image preview with its name, size and date, a red toss button and a green keep button.">
</p>

Point QuickToss at a folder — `Downloads` is the usual suspect — and it shows you each file with a preview so you can decide in a second. Deleted files go to the system Trash, and every action can be undone, so there's nothing to be nervous about.

## Download

Grab the latest version from the [releases page](https://github.com/killerwolf/QuickToss/releases/latest). What changed in each one is in [CHANGELOG.md](CHANGELOG.md).

QuickToss ships for **macOS 12 and later** as a single universal download — `QuickToss-<version>-universal.dmg` — that runs natively on both Apple Silicon and Intel. It's about 6 MB.

### First launch: "QuickToss.app is damaged"

If macOS refuses to open the app with a message saying it's damaged, the app isn't actually broken — QuickToss isn't signed with a paid Apple Developer certificate yet, and macOS blocks unsigned apps downloaded from the internet.

To allow it, run this once in Terminal:

```bash
xattr -cr /Applications/QuickToss.app
```

Then open the app normally. You'll need to repeat this after installing a new version. Removing this friction is tracked in [#7](https://github.com/killerwolf/QuickToss/issues/7).

### Updates

QuickToss checks for new versions on launch and shows a notice when one is available. Installing is manual for now — the notice links to the release page. (Automatic in-place updates also need the code signing from [#7](https://github.com/killerwolf/QuickToss/issues/7).)

## Using it

1. Click **Select Folder to Organize** and pick a folder.
2. For each file, decide:
   - **Toss** — swipe left, press `←` or `Backspace`, or click the red button. The file goes to the Trash.
   - **Keep** — swipe right, press `→` or `Space`, or click the green button. The file is left alone.
3. When you reach the end, you get a summary of what you cleared.

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| `←` or `Backspace` | Toss (move to Trash) |
| `→` or `Space` | Keep |
| `I` | Show/hide file details |
| `O` | Open the file in whatever app owns it |
| `Cmd+Z` | Undo the last action |

### Tips

- Start with `Downloads`. It's almost always the biggest win.
- Don't overthink it — `Cmd+Z` undoes any decision.
- Nothing is permanently deleted. Tossed files sit in your Trash until you empty it.

## What it can preview

- **Images** — JPEG, PNG, GIF, WebP, BMP, TIFF, HEIC
- **Documents** — PDF, Word, PowerPoint, Excel, RTF, and plain-text formats (TXT, MD, LOG, JSON, XML, CSV, YAML)
- **Video** — MP4, MOV, AVI (poster frame; press `O` to play it)

Anything macOS can draw, QuickToss shows, because it asks macOS: previews come from the same Quick Look renderer behind Finder's space-bar preview. A slide deck looks like the deck, not like a list of its text.

Video is the exception — you get the poster frame rather than playback. Improving that is tracked in [#12](https://github.com/killerwolf/QuickToss/issues/12).

## Your files stay yours

- QuickToss makes no network requests with your files — everything happens locally. It only talks to GitHub to check whether a newer version exists.
- Tossed files go to the system Trash, never a permanent delete.
- It only reads the folder you explicitly choose.

## Built with

QuickToss is a native Rust app built on [GPUI](https://gpui.rs), the GPU-accelerated UI framework behind the Zed editor, with [GPUI Kit](https://gpui-kit.com) for its components. It moved off Electron in 2.0 — [ADR 0002](docs/adr/0002-gpui-instead-of-electron.md) explains what that bought and what it cost.

## Contributing

Setup, architecture, and the release process are in [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports and ideas are welcome in [issues](https://github.com/killerwolf/QuickToss/issues).

## License

MIT.
