# GPUI instead of Electron

QuickToss shows you one file and waits for one keystroke. The Electron build
shipped a 110 MB DMG and a 341 MB installed bundle to do that, because a
Chromium runtime came along with it. It also carried five JavaScript preview
libraries — pdfjs, mammoth, SheetJS, JSZip, heic2any, about 30 MB of the
bundle — each reimplementing, worse, a file format macOS already renders.

We have rewritten the app on [GPUI](https://gpui.rs) (Zed's GPU-accelerated
Rust UI framework) with [GPUI Kit](https://gpui-kit.com) for the component
layer, and dropped Electron, React, Vite, Tailwind and the whole npm tree.

## What leaving Electron buys

These two are the bulk of the improvement, and it is worth being clear that
neither is a reason to pick GPUI specifically — any option that stops
shipping a browser engine and moves the file handling into Rust gets them,
Tauri included. They are listed first because they are the point.

**The download stops being the biggest thing about the app.** 110 MB of DMG
becomes about 6 MB, and a 341 MB installed bundle becomes 13 MB. There is
also no second copy of a browser engine on disk per Electron app installed.

**Previews get better, not just cheaper.** Instead of five JS libraries, one
call to `QLThumbnailGenerator` — the same renderer behind Finder's Quick Look
— covers PDF, Word, Excel, PowerPoint, RTF, HEIC and video poster frames. A
deck now looks like the deck rather than like a list of its text runs, and
HEIC no longer needs a JavaScript decoder to be readable. The Electron build
had already reached for this, but only for PPTX and only by shelling out to
`qlmanage` into a temp directory.

## What picking GPUI buys on top

**The process boundary goes away.** Every file operation used to cross a
hand-rolled 9-channel IPC contract between the main process and the renderer
(see [ADR 0001](0001-hand-rolled-ipc-contract.md)), with the types kept in
step by hand across three files. `scan_folder` is now a function that returns
a `Vec<FileItem>`, and that whole contract — along with the ADR justifying it
— is gone rather than maintained.

**The hardened-runtime exceptions go away.** Signing needed
`allow-jit` and `allow-unsigned-executable-memory` to accommodate V8. Those
are precisely the exceptions that weaken the hardened runtime, and a Rust
binary with no JavaScript engine in it asks for neither.

**Rendering doesn't drift with the OS.** A WebView app inherits whichever
WebKit the running macOS ships, so a layout can change under you on someone
else's machine. GPUI draws everything itself.

**The npm supply chain goes away entirely, not partly.** The clearest
evidence that this was a standing tax is in the old CONTRIBUTING: `react-pdf`
was pinned at 6.2.2 forever because newer versions died on
`Promise.withResolvers` under the bundled Node, and the icon script avoided
`electron-icon-builder` because it drags in a deprecated phantomjs-prebuilt
that had already failed CI on a transient 504. Constraints of that shape stop
arriving.

## What it costs

**Video no longer plays.** GPUI has no video element, and the one third-party
player needs GStreamer installed system-wide, which is not something a
13 MB app should demand of anyone. Video files now show the poster frame
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

**Tauri** was the strongest alternative, and stronger than an earlier draft of
this ADR admitted. That draft claimed Tauri would have kept the JavaScript
preview stack. That is not true: Tauri's backend is Rust, so the same
`QLThumbnailGenerator` bridge in `preview.rs` would have worked there,
handing PNG bytes to the webview. The preview improvement was never
GPUI-specific. Neither was the size: Tauri uses the system WebView, so it
would have landed in the same order of magnitude.

Set those aside and Tauri wins on three counts. **Video would still play** —
a WebView has `<video>`, so the one real regression above would not exist.
**It is mature** where GPUI is pre-1.0. And **the React code would have
survived**, which matters for anyone who might contribute.

GPUI was chosen anyway, for the four things in the section above — no
process boundary at all, no npm, no JIT entitlements, and rendering that
doesn't vary with the OS's WebKit — and because a small, self-contained app
is the right place to absorb a pre-1.0 dependency. That is a defensible call
rather than an obvious one. Anyone revisiting it should weigh a working
video preview against those four, and should know that most of the headline
numbers in this document would have been available either way.

**SwiftUI** is what the original PRD specified, and would be the most native
option. It was rejected for pinning the project to macOS with no path to
Windows or Linux, which GPUI leaves open even though the current build is
macOS-only.

**Staying on Electron** and trimming the preview libraries would have
recovered maybe 30 MB of the 110. The runtime is the bulk of the cost, and
nothing short of leaving removes it.
