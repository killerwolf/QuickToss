//! The application: what's on screen, what the keys do, and how a decision
//! turns into a file moving.
//!
//! Between them, `src/App.tsx`, `src/components/FileViewer.tsx` and the five
//! preview components used to hold this. The screen state machine is
//! unchanged — welcome, viewing, complete — and so are the keys.

use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use gpui_kit::*;

use crate::files::{self, FileItem};
use crate::preview::{self, Preview};
use crate::session::{Decision, Session};
use crate::settings::{self, Settings};
use crate::sound::Sounds;
use crate::update::{self, UpdateStatus};

actions!(
    quicktoss,
    [
        Toss,
        Keep,
        Undo,
        ToggleDetails,
        ToggleSettings,
        OpenExternally,
        ChooseFolder,
        StartOver,
        Dismiss,
    ]
);

pub const KEY_CONTEXT: &str = "QuickToss";

/// How long the confirmation flash sits on screen before the file actually
/// moves. Carried over from the Electron build: it's the beat that makes a
/// fast run of decisions feel like it registered each one.
const FLASH: Duration = Duration::from_millis(200);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Screen {
    Welcome,
    Viewing,
    Complete,
}

/// The preview for the file currently on screen.
pub enum PreviewState {
    Loading,
    /// Hand the path to GPUI's image element and let it decode.
    ImagePath(PathBuf),
    /// Rendered by Quick Look and decoded from PNG bytes.
    Rendered(Arc<Image>),
    Text {
        body: SharedString,
        truncated: bool,
    },
    Unavailable,
}

pub struct QuickToss {
    pub screen: Screen,
    pub session: Session,
    pub settings: Settings,
    pub settings_path: Option<PathBuf>,
    pub sounds: Sounds,
    pub focus_handle: FocusHandle,

    /// Which file the preview belongs to, so a result arriving late for a file
    /// you've already moved past is discarded instead of shown.
    pub preview_for: Option<PathBuf>,
    pub preview: PreviewState,

    pub show_details: bool,
    pub settings_open: bool,
    pub flash: Option<Decision>,
    /// A decision is mid-flight (flashing, or waiting on the Trash). Blocks a
    /// second decision from landing on a file that's already on its way out.
    pub busy: bool,
    pub scanning: bool,
    pub update: Option<UpdateStatus>,
    /// A transient message along the bottom of the window. Replaces the
    /// Electron build's `alert()` calls, which stopped the app dead to tell you
    /// something you could have read in passing.
    pub banner: Option<Banner>,
}

#[derive(Debug, Clone)]
pub struct Banner {
    pub text: SharedString,
    pub tone: Tone,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Tone {
    Neutral,
    Problem,
}

impl QuickToss {
    pub fn new(cx: &mut Context<Self>) -> Self {
        let settings_path = settings::default_path();
        let settings = settings_path
            .as_deref()
            .map(settings::load)
            .unwrap_or_default();

        let this = Self {
            screen: Screen::Welcome,
            session: Session::new(),
            settings,
            settings_path,
            sounds: Sounds::load(),
            focus_handle: cx.focus_handle(),
            preview_for: None,
            preview: PreviewState::Loading,
            show_details: false,
            settings_open: false,
            flash: None,
            busy: false,
            scanning: false,
            update: None,
            banner: None,
        };

        this.check_for_updates(cx);
        this
    }

    // ---- folder selection -------------------------------------------------

    pub fn choose_folder(
        &mut self,
        _: &ChooseFolder,
        _window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        if self.scanning {
            return;
        }
        self.scanning = true;
        cx.notify();

        let paths = cx.prompt_for_paths(PathPromptOptions {
            files: false,
            directories: true,
            multiple: false,
            prompt: Some("Choose".into()),
        });

        cx.spawn(async move |this, cx| {
            let chosen = paths.await.ok().and_then(|r| r.ok()).flatten();

            let Some(folder) = chosen.and_then(|paths| paths.into_iter().next()) else {
                // Cancelled: drop straight back to the welcome screen.
                return this.update(cx, |this, cx| {
                    this.scanning = false;
                    cx.notify();
                });
            };

            let scan = cx
                .background_spawn({
                    let folder = folder.clone();
                    async move { files::scan_folder(&folder) }
                })
                .await;

            this.update(cx, |this, cx| {
                this.scanning = false;

                match scan {
                    Ok(found) if found.is_empty() => {
                        this.show_banner(
                            format!(
                                "Nothing to sort through in {}.",
                                folder
                                    .file_name()
                                    .unwrap_or(folder.as_os_str())
                                    .to_string_lossy()
                            ),
                            Tone::Neutral,
                            cx,
                        );
                    }
                    Ok(found) => {
                        this.session.start(found, folder);
                        this.screen = Screen::Viewing;
                        this.show_details = false;
                        this.load_preview(cx);
                    }
                    Err(error) => {
                        eprintln!("Could not scan folder: {error}");
                        this.show_banner(
                            "Couldn't read that folder.".to_string(),
                            Tone::Problem,
                            cx,
                        );
                    }
                }

                cx.notify();
            })
        })
        .detach();
    }

    pub fn start_over(&mut self, _: &StartOver, _window: &mut Window, cx: &mut Context<Self>) {
        self.session.reset();
        self.screen = Screen::Welcome;
        self.preview_for = None;
        self.preview = PreviewState::Loading;
        cx.notify();
    }

    // ---- decisions --------------------------------------------------------

    pub fn on_toss(&mut self, _: &Toss, window: &mut Window, cx: &mut Context<Self>) {
        self.decide(Decision::Toss, window, cx);
    }

    pub fn on_keep(&mut self, _: &Keep, window: &mut Window, cx: &mut Context<Self>) {
        self.decide(Decision::Keep, window, cx);
    }

    fn decide(&mut self, decision: Decision, window: &mut Window, cx: &mut Context<Self>) {
        if self.screen != Screen::Viewing || self.busy || self.settings_open {
            return;
        }
        let Some(file) = self.session.current().cloned() else {
            return;
        };

        if decision == Decision::Toss && self.settings.confirm_toss {
            // A native alert rather than an in-app modal: this is the one
            // irreversible-feeling action in the app, and the system dialog is
            // what people already read carefully.
            let answer = window.prompt(
                PromptLevel::Warning,
                &format!("Move \u{201c}{}\u{201d} to the Trash?", file.name),
                Some("You can get it back from the Trash until you empty it."),
                &["Move to Trash", "Cancel"],
                cx,
            );

            cx.spawn(async move |this, cx| {
                if answer.await.unwrap_or(1) != 0 {
                    return anyhow::Ok(());
                }
                this.update(cx, |this, cx| this.commit(decision, cx))?;
                anyhow::Ok(())
            })
            .detach();
            return;
        }

        self.commit(decision, cx);
    }

    /// Flash the decision, then carry it out once the flash has been seen.
    fn commit(&mut self, decision: Decision, cx: &mut Context<Self>) {
        let Some(file) = self.session.current().cloned() else {
            return;
        };
        let file_index = self.session.current_index;

        self.busy = true;
        self.flash = Some(decision);
        if self.settings.sound_effects {
            self.sounds.play(decision);
        }
        cx.notify();

        cx.spawn(async move |this, cx| {
            cx.background_executor().timer(FLASH).await;

            if decision == Decision::Toss {
                let path = file.path.clone();
                let trashed = cx
                    .background_spawn(async move { files::move_to_trash(&path) })
                    .await;

                if let Err(error) = trashed {
                    // Nothing is recorded: the session only learns about a toss
                    // that actually happened, so the file stays in front of you.
                    return this.update(cx, |this, cx| {
                        this.busy = false;
                        this.flash = None;
                        eprintln!("Could not move {} to trash: {error}", file.path.display());
                        this.show_banner(
                            format!("Couldn't move \u{201c}{}\u{201d} to the Trash.", file.name),
                            Tone::Problem,
                            cx,
                        );
                        cx.notify();
                    });
                }
            }

            this.update(cx, |this, cx| {
                match decision {
                    Decision::Toss => this.session.record_toss(file_index, file),
                    Decision::Keep => this.session.keep(),
                }

                this.busy = false;
                this.flash = None;
                this.advance(cx);
            })
        })
        .detach();
    }

    pub fn on_undo(&mut self, _: &Undo, _window: &mut Window, cx: &mut Context<Self>) {
        if self.busy || self.session.undo().is_none() {
            return;
        }

        // Undoing from the summary puts you back in front of the file.
        if self.screen == Screen::Complete {
            self.screen = Screen::Viewing;
        }
        self.load_preview(cx);
        cx.notify();
    }

    fn advance(&mut self, cx: &mut Context<Self>) {
        if self.session.is_complete() {
            self.screen = Screen::Complete;
            self.preview_for = None;
        } else {
            self.load_preview(cx);
        }
        cx.notify();
    }

    // ---- previews ---------------------------------------------------------

    /// Kick off a preview for whatever file is now in front. Everything here
    /// happens off the main thread — Quick Look and the filesystem both block,
    /// and neither is worth a dropped frame.
    pub fn load_preview(&mut self, cx: &mut Context<Self>) {
        let Some(file) = self.session.current().cloned() else {
            self.preview_for = None;
            self.preview = PreviewState::Unavailable;
            return;
        };

        if self.preview_for.as_deref() == Some(file.path.as_path()) {
            return;
        }

        self.preview_for = Some(file.path.clone());
        self.preview = PreviewState::Loading;
        cx.notify();

        let path = file.path.clone();
        cx.spawn(async move |this, cx| {
            let loaded = cx
                .background_spawn(async move { preview::load(&file) })
                .await;

            this.update(cx, |this, cx| {
                // A slow preview for a file you've already moved past is stale.
                if this.preview_for.as_deref() != Some(path.as_path()) {
                    return;
                }

                this.preview = match loaded {
                    Preview::ImagePath => PreviewState::ImagePath(path),
                    Preview::Rendered(bytes) => {
                        PreviewState::Rendered(Arc::new(Image::from_bytes(ImageFormat::Png, bytes)))
                    }
                    Preview::Text { body, truncated } => PreviewState::Text {
                        body: body.into(),
                        truncated,
                    },
                    Preview::Unavailable => PreviewState::Unavailable,
                };
                cx.notify();
            })
        })
        .detach();
    }

    // ---- odds and ends ----------------------------------------------------

    pub fn toggle_details(&mut self, _: &ToggleDetails, _w: &mut Window, cx: &mut Context<Self>) {
        self.show_details = !self.show_details;
        cx.notify();
    }

    pub fn toggle_settings(&mut self, _: &ToggleSettings, _w: &mut Window, cx: &mut Context<Self>) {
        self.settings_open = !self.settings_open;
        cx.notify();
    }

    pub fn dismiss(&mut self, _: &Dismiss, _window: &mut Window, cx: &mut Context<Self>) {
        if self.settings_open {
            self.settings_open = false;
            cx.notify();
        }
    }

    /// Open the current file in whatever app owns it.
    ///
    /// New in this build, and the reason a missing preview is no longer a dead
    /// end: whatever QuickToss can't draw, the file's real application can.
    pub fn open_externally(&mut self, _: &OpenExternally, _w: &mut Window, cx: &mut Context<Self>) {
        if let Some(file) = self.session.current() {
            cx.open_with_system(&file.path);
        }
    }

    pub fn update_setting(&mut self, apply: impl FnOnce(&mut Settings), cx: &mut Context<Self>) {
        apply(&mut self.settings);

        if let Some(path) = &self.settings_path {
            if let Err(error) = settings::save(path, &self.settings) {
                eprintln!("Could not save settings: {error}");
            }
        }
        cx.notify();
    }

    fn check_for_updates(&self, cx: &mut Context<Self>) {
        let current = env!("CARGO_PKG_VERSION").to_string();

        cx.spawn(async move |this, cx| {
            let status = cx
                .background_spawn(async move { update::check(&current) })
                .await;

            let Ok(UpdateStatus::Available { version }) = status else {
                return anyhow::Ok(());
            };

            this.update(cx, |this, cx| {
                this.update = Some(UpdateStatus::Available { version });
                cx.notify();
            })?;
            anyhow::Ok(())
        })
        .detach();
    }

    pub fn open_release_page(&self, cx: &mut App) {
        let status = self.update.clone().unwrap_or(UpdateStatus::UpToDate);
        cx.open_url(&status.release_url());
    }

    /// Show a message for a few seconds, then take it away. Nothing here is
    /// worth a dialog: the work carries on around it either way.
    pub fn show_banner(&mut self, text: String, tone: Tone, cx: &mut Context<Self>) {
        self.banner = Some(Banner {
            text: text.into(),
            tone,
        });
        cx.notify();

        cx.spawn(async move |this, cx| {
            cx.background_executor().timer(Duration::from_secs(4)).await;
            this.update(cx, |this, cx| {
                this.banner = None;
                cx.notify();
            })
        })
        .detach();
    }

    pub fn current_file(&self) -> Option<&FileItem> {
        self.session.current()
    }
}
