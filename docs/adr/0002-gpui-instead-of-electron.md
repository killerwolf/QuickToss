# GPUI instead of Electron

QuickToss shows you one file and waits for one keystroke. The Electron build
shipped a 110 MB DMG and a 341 MB installed bundle to do that, because a
Chromium runtime came along with it. It also carried five JavaScript preview
libraries — pdfjs, mammoth, SheetJS, JSZip, heic2any, about 30 MB of the
bundle — each reimplementing, worse, a file format macOS already renders.

We have rewritten the app on [GPUI](https://gpui.rs) (Zed's GPU-accelerated
Rust UI framework) with [GPUI Kit](https://gpui-kit.com) for the component
layer, and dropped Electron, React, Vite, Tailwind and the whole npm tree.

## What this buys

**The download stops being the biggest thing about the app.** A universal
Rust binary with no runtime attached is a fraction of what Chromium costs to
ship, and there is no second copy of a browser engine on disk per Electron
app installed.

**Previews get better, not just cheaper.** Instead of five JS libraries, one
call to `QLThumbnailGenerator` — the same renderer behind Finder's Quick Look
— covers PDF, Word, Excel, PowerPoint, RTF, HEIC and video poster frames. A
deck now looks like the deck rather than like a list of its text runs, and
HEIC no longer needs a JavaScript decoder to be readable. The Electron build
had already reached for this, but only for PPTX and only by shelling out to
`qlmanage` into a temp directory.

**The process boundary goes away.** Every file operation used to cross a
hand-rolled 9-channel IPC contract between the main process and the renderer
(see [ADR 0001](0001-hand-rolled-ipc-contract.md)), with the types kept in
step by hand across three files. `scan_folder` is now a function that returns
a `Vec<FileItem>`, and that whole contract — along with the ADR justifying it
— is gone rather than maintained.

**The hardened-runtime exceptions go away.** Signing needed
`allow-jit` and `allow-unsigned-executable-memory` to accommodate V8. Those
are precisely the exceptions that weaken the hardened runtime, and a Rust
binary asks for neither.

## What it costs

**Video no longer plays.** GPUI has no video element, and the one third-party
player needs GStreamer installed system-wide, which is not something a
21 MB app should demand of anyone. Video files now show the poster frame
Quick Look produces, plus `O` to open them in QuickTime. For deciding whether
to keep a screen recording this is close to sufficient, but it is a real
regression and the honest name for it is one. The `videoAutoplay` setting it
supported has been dropped; the other two settings carry over from the
existing `settings.json` untouched.

**GPUI is pre-1.0.** It publishes as `gpui-pre-*` snapshots of Zed's main
branch and breaks between versions. GPUI Kit pins a matching set and is used
in a shipped commercial product, which is the mitigation, but upgrades will
occasionally cost an afternoon. Set against an Electron major upgrade every
few months, that trade looks fine.

**Fewer people can contribute.** React and TypeScript are more widely known
than Rust and GPUI. For an app this size, with this much of its logic now in
plain testable functions, we think the smaller surface offsets it.

## Alternatives considered

**Tauri** keeps the web front end and drops the bundled Chromium by using the
system WebView. It would have preserved the React code and cut the download
substantially. We passed because it keeps the IPC boundary and the JavaScript
preview stack — the two things that actually make this codebase awkward —
and leaves rendering at the mercy of whichever WebKit the OS ships.

**SwiftUI** is what the original PRD specified, and would be the most native
option. It was rejected for pinning the project to macOS with no path to
Windows or Linux, which GPUI leaves open even though the current build is
macOS-only.

**Staying on Electron** and trimming the preview libraries would have
recovered maybe 30 MB of the 110. The runtime is the bulk of the cost, and
nothing short of leaving removes it.
