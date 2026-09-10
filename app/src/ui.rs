//! What QuickToss looks like.
//!
//! The shape of the app is unchanged from the Electron build — welcome, one
//! file at a time, a summary at the end, the same keys throughout — but the
//! chrome is quieter. The old UI framed every screen in a blue gradient and
//! two panels of its own furniture; here the window is a neutral ground and
//! the file is the only thing with any weight on it.

use gpui_kit::base::{h_flex, v_flex, StyledExt};
use gpui_kit::component::button::{Button, ButtonVariants};
use gpui_kit::component::switch::Switch;
use gpui_kit::component::{ActiveTheme, Disableable, IconName, Sizable};
use gpui_kit::prelude::FluentBuilder;
use gpui_kit::*;

use crate::app::{
    Banner, ChooseFolder, Keep, PreviewState, QuickToss, Screen, StartOver, ToggleDetails,
    ToggleSettings, Tone, Toss, Undo, KEY_CONTEXT,
};
use crate::files::{format_size, FileKind};
use crate::session::Decision;
use crate::update::UpdateStatus;

impl Render for QuickToss {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        div()
            .key_context(KEY_CONTEXT)
            .track_focus(&self.focus_handle)
            .on_action(cx.listener(Self::on_toss))
            .on_action(cx.listener(Self::on_keep))
            .on_action(cx.listener(Self::on_undo))
            .on_action(cx.listener(Self::toggle_details))
            .on_action(cx.listener(Self::toggle_settings))
            .on_action(cx.listener(Self::open_externally))
            .on_action(cx.listener(Self::choose_folder))
            .on_action(cx.listener(Self::start_over))
            .on_action(cx.listener(Self::dismiss))
            .relative()
            .size_full()
            .bg(cx.theme().background)
            .text_color(cx.theme().foreground)
            .child(match self.screen {
                Screen::Welcome => self.render_welcome(cx).into_any_element(),
                Screen::Viewing => self.render_viewer(window, cx).into_any_element(),
                Screen::Complete => self.render_complete(cx).into_any_element(),
            })
            .children(self.render_update_pill(cx))
            .children(self.render_banner(cx))
            .children(self.render_settings(cx))
    }
}

impl QuickToss {
    // ---- welcome ----------------------------------------------------------

    fn render_welcome(&mut self, cx: &mut Context<Self>) -> impl IntoElement {
        v_flex()
            .size_full()
            .items_center()
            .justify_center()
            .gap_8()
            .p_10()
            .child(
                v_flex()
                    .items_center()
                    .gap_3()
                    .child(div().text_3xl().font_semibold().child("QuickToss"))
                    .child(
                        div()
                            .max_w(px(440.))
                            .text_center()
                            .text_color(cx.theme().muted_foreground)
                            .child(
                                "Point it at a folder and go through it one file at a time. \
                                 Nothing leaves your Mac, and anything you toss waits in the Trash.",
                            ),
                    ),
            )
            .child(
                Button::new("choose-folder")
                    .primary()
                    .large()
                    .icon(IconName::FolderOpen)
                    .label(if self.scanning {
                        "Opening\u{2026}"
                    } else {
                        "Choose a folder"
                    })
                    .loading(self.scanning)
                    .on_click(cx.listener(|this, _, window, cx| {
                        this.choose_folder(&ChooseFolder, window, cx)
                    })),
            )
            .child(self.render_legend(cx))
    }

    // ---- viewer -----------------------------------------------------------

    fn render_viewer(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let total = self.session.files.len();
        let position = (self.session.current_index + 1).min(total);
        let progress = self.session.progress();
        let can_undo = self.session.can_undo();
        // Which folder you're in: obvious when you picked it, less so twenty
        // files later, and it's the difference between confident tossing and
        // second-guessing.
        let folder = self
            .session
            .folder_path
            .as_deref()
            .and_then(|path| path.file_name())
            .map(|name| name.to_string_lossy().into_owned());

        v_flex()
            .size_full()
            // A hairline across the very top of the window rather than a
            // progress bar sitting in a toolbar: it reads as "how far in you
            // are" without taking a row of its own.
            .child(
                div()
                    .h(px(2.))
                    .w_full()
                    .bg(cx.theme().border)
                    .child(div().h_full().w(relative(progress)).bg(cx.theme().primary)),
            )
            .child(
                h_flex()
                    .items_center()
                    .justify_between()
                    .gap_4()
                    .px_4()
                    .py_2p5()
                    .child(
                        Button::new("back")
                            .ghost()
                            .small()
                            .icon(IconName::ArrowLeft)
                            .label("Folders")
                            .on_click(cx.listener(|this, _, window, cx| {
                                this.start_over(&StartOver, window, cx)
                            })),
                    )
                    .child(
                        h_flex()
                            .gap_2()
                            .min_w_0()
                            .text_sm()
                            .text_color(cx.theme().muted_foreground)
                            .children(folder.map(|name| div().truncate().child(name)))
                            .child("\u{00b7}")
                            .child(format!("{position} of {total}")),
                    )
                    .child(
                        h_flex()
                            .gap_1()
                            .child(
                                Button::new("undo")
                                    .ghost()
                                    .small()
                                    .icon(IconName::Undo)
                                    .label("Undo")
                                    .disabled(!can_undo)
                                    .on_click(cx.listener(|this, _, window, cx| {
                                        this.on_undo(&Undo, window, cx)
                                    })),
                            )
                            .child(
                                Button::new("settings")
                                    .ghost()
                                    .small()
                                    .icon(IconName::Settings)
                                    .on_click(cx.listener(|this, _, window, cx| {
                                        this.toggle_settings(&ToggleSettings, window, cx)
                                    })),
                            ),
                    ),
            )
            .child(self.render_preview(cx))
            .child(self.render_file_bar(cx))
    }

    fn render_preview(&mut self, cx: &mut Context<Self>) -> impl IntoElement {
        let border = cx.theme().border;
        let muted = cx.theme().muted_foreground;

        let body = match &self.preview {
            PreviewState::Loading => div()
                .text_sm()
                .text_color(muted)
                .child("Loading preview\u{2026}")
                .into_any_element(),

            PreviewState::ImagePath(path) => img(path.clone())
                .max_w_full()
                .max_h_full()
                .rounded_lg()
                .into_any_element(),

            PreviewState::Rendered(image) => img(image.clone())
                .max_w_full()
                .max_h_full()
                .rounded_lg()
                .into_any_element(),

            PreviewState::Text { body, truncated } => v_flex()
                .size_full()
                .max_w(px(900.))
                .rounded_lg()
                .border_1()
                .border_color(border)
                .bg(cx.theme().popover)
                .overflow_hidden()
                .child(
                    div()
                        .id("text-preview")
                        .flex_1()
                        .overflow_y_scroll()
                        .p_5()
                        .font_family("ui-monospace")
                        .text_sm()
                        .child(body.clone()),
                )
                .when(*truncated, |this| {
                    this.child(
                        div()
                            .border_t_1()
                            .border_color(border)
                            .px_5()
                            .py_2()
                            .text_xs()
                            .text_color(muted)
                            .child(
                                "Showing the first 256 KB \u{2014} press O to open the whole file.",
                            ),
                    )
                })
                .into_any_element(),

            PreviewState::Unavailable => self.render_no_preview(cx).into_any_element(),
        };

        div()
            .relative()
            .flex_1()
            .min_h_0()
            .flex()
            .items_center()
            .justify_center()
            .p_6()
            .child(body)
            .children(self.flash.map(|decision| self.render_flash(decision, cx)))
    }

    /// The end of the line for a file macOS can't draw: name it, and point at
    /// the one key that will open it properly.
    fn render_no_preview(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let extension = self
            .current_file()
            .map(|file| file.extension.trim_start_matches('.').to_uppercase())
            .unwrap_or_default();

        v_flex()
            .items_center()
            .gap_3()
            .child(
                div()
                    .text_color(cx.theme().muted_foreground)
                    .text_size(px(40.))
                    .child(IconName::File),
            )
            .child(
                div()
                    .text_color(cx.theme().muted_foreground)
                    .child(if extension.is_empty() {
                        "No preview for this one".to_string()
                    } else {
                        format!("No preview for {extension} files")
                    }),
            )
            .child(self.render_hint("O", "Open it", cx))
    }

    /// The beat of feedback between pressing a key and the file moving.
    fn render_flash(&self, decision: Decision, cx: &mut Context<Self>) -> impl IntoElement {
        let (label, tint) = match decision {
            Decision::Toss => ("Tossed", cx.theme().danger),
            Decision::Keep => ("Kept", cx.theme().success),
        };

        div()
            .absolute()
            .inset_0()
            .flex()
            .items_center()
            .justify_center()
            .child(
                div()
                    .px_6()
                    .py_3()
                    .rounded_full()
                    .bg(tint)
                    .text_color(cx.theme().background)
                    .text_lg()
                    .font_semibold()
                    .shadow_lg()
                    .child(label),
            )
    }

    fn render_file_bar(&mut self, cx: &mut Context<Self>) -> impl IntoElement {
        let Some(file) = self.current_file().cloned() else {
            return div().into_any_element();
        };

        let muted = cx.theme().muted_foreground;
        let busy = self.busy;

        v_flex()
            .border_t_1()
            .border_color(cx.theme().border)
            .child(
                h_flex()
                    .items_start()
                    .justify_between()
                    .gap_4()
                    .px_6()
                    .pt_4()
                    .child(
                        v_flex()
                            .flex_1()
                            .min_w_0()
                            .gap_1()
                            .child(div().font_medium().truncate().child(file.name.clone()))
                            .child(
                                h_flex()
                                    .gap_2()
                                    .text_sm()
                                    .text_color(muted)
                                    .child(format_size(file.size))
                                    .child("\u{00b7}")
                                    .child(crate::ui::format_modified(&file.modified))
                                    .child("\u{00b7}")
                                    .child(kind_label(file.kind)),
                            )
                            .when(self.show_details, |this| {
                                this.child(
                                    v_flex()
                                        .mt_2()
                                        .gap_1()
                                        .rounded_md()
                                        .bg(cx.theme().muted)
                                        .px_3()
                                        .py_2()
                                        .text_xs()
                                        .text_color(muted)
                                        .child(
                                            div().truncate().child(file.path.display().to_string()),
                                        )
                                        .child(format!(
                                            "{} \u{00b7} {}",
                                            file.extension,
                                            file.kind.label()
                                        )),
                                )
                            }),
                    )
                    .child(
                        Button::new("details")
                            .ghost()
                            .xsmall()
                            .icon(IconName::Eye)
                            .tooltip("File details (I)")
                            .on_click(cx.listener(|this, _, window, cx| {
                                this.toggle_details(&ToggleDetails, window, cx)
                            })),
                    ),
            )
            .child(
                h_flex()
                    .justify_center()
                    .gap_3()
                    .px_6()
                    .py_4()
                    .child(
                        Button::new("toss")
                            .danger()
                            .large()
                            .icon(IconName::Delete)
                            .label("Toss")
                            .disabled(busy)
                            .on_click(
                                cx.listener(|this, _, window, cx| this.on_toss(&Toss, window, cx)),
                            ),
                    )
                    .child(
                        Button::new("keep")
                            .success()
                            .large()
                            .icon(IconName::Check)
                            .label("Keep")
                            .disabled(busy)
                            .on_click(
                                cx.listener(|this, _, window, cx| this.on_keep(&Keep, window, cx)),
                            ),
                    ),
            )
            .child(
                div()
                    .flex()
                    .justify_center()
                    .pb_4()
                    .child(self.render_legend(cx)),
            )
            .into_any_element()
    }

    // ---- completion -------------------------------------------------------

    fn render_complete(&mut self, cx: &mut Context<Self>) -> impl IntoElement {
        let tossed = self.session.tossed.len();
        let kept = self.session.kept.len();
        let can_undo = self.session.can_undo();
        let muted = cx.theme().muted_foreground;

        v_flex()
            .size_full()
            .items_center()
            .justify_center()
            .gap_8()
            .p_10()
            .child(
                v_flex()
                    .items_center()
                    .gap_2()
                    .child(div().text_3xl().font_semibold().child("All done"))
                    .child(div().text_color(muted).child(summary_line(tossed, kept))),
            )
            .child(
                h_flex()
                    .gap_12()
                    .child(self.render_stat(tossed, "Tossed", cx.theme().danger, cx))
                    .child(self.render_stat(kept, "Kept", cx.theme().success, cx)),
            )
            .child(
                h_flex()
                    .gap_3()
                    .child(
                        Button::new("another")
                            .primary()
                            .large()
                            .icon(IconName::FolderOpen)
                            .label("Choose another folder")
                            .on_click(cx.listener(|this, _, window, cx| {
                                this.start_over(&StartOver, window, cx);
                                this.choose_folder(&ChooseFolder, window, cx);
                            })),
                    )
                    .when(can_undo, |this| {
                        this.child(
                            Button::new("undo-last")
                                .large()
                                .icon(IconName::Undo)
                                .label("Undo last")
                                .on_click(cx.listener(|this, _, window, cx| {
                                    this.on_undo(&Undo, window, cx)
                                })),
                        )
                    }),
            )
    }

    fn render_stat(
        &self,
        count: usize,
        label: &'static str,
        tint: Hsla,
        cx: &mut Context<Self>,
    ) -> impl IntoElement {
        v_flex()
            .items_center()
            .gap_1()
            .child(
                div()
                    .text_size(px(36.))
                    .font_semibold()
                    .text_color(tint)
                    .child(count.to_string()),
            )
            .child(
                div()
                    .text_sm()
                    .text_color(cx.theme().muted_foreground)
                    .child(label),
            )
    }

    // ---- settings ---------------------------------------------------------

    fn render_settings(&mut self, cx: &mut Context<Self>) -> Option<impl IntoElement> {
        if !self.settings_open {
            return None;
        }

        Some(
            div()
                .absolute()
                .inset_0()
                .flex()
                .items_center()
                .justify_center()
                .bg(hsla(0., 0., 0., 0.45))
                .on_mouse_down(
                    MouseButton::Left,
                    cx.listener(|this, _, window, cx| {
                        this.toggle_settings(&ToggleSettings, window, cx)
                    }),
                )
                .child(
                    v_flex()
                        .w(px(420.))
                        .rounded_xl()
                        .border_1()
                        .border_color(cx.theme().border)
                        .bg(cx.theme().popover)
                        .shadow_lg()
                        // Swallow clicks inside the card so they don't reach the
                        // backdrop's dismiss handler.
                        .on_mouse_down(MouseButton::Left, |_, _, cx| cx.stop_propagation())
                        .child(
                            h_flex()
                                .items_center()
                                .justify_between()
                                .px_5()
                                .py_4()
                                .border_b_1()
                                .border_color(cx.theme().border)
                                .child(div().font_semibold().child("Settings"))
                                .child(
                                    Button::new("close-settings")
                                        .ghost()
                                        .xsmall()
                                        .icon(IconName::Close)
                                        .on_click(cx.listener(|this, _, window, cx| {
                                            this.toggle_settings(&ToggleSettings, window, cx)
                                        })),
                                ),
                        )
                        .child(
                            v_flex()
                                .p_5()
                                .gap_5()
                                .child(self.render_toggle(
                                    "sound-effects",
                                    "Sound effects",
                                    "A short cue on every decision.",
                                    self.settings.sound_effects,
                                    |settings, value| settings.sound_effects = value,
                                    cx,
                                ))
                                .child(self.render_toggle(
                                    "confirm-toss",
                                    "Confirm before tossing",
                                    "Ask before a file goes to the Trash.",
                                    self.settings.confirm_toss,
                                    |settings, value| settings.confirm_toss = value,
                                    cx,
                                )),
                        ),
                ),
        )
    }

    fn render_toggle(
        &self,
        id: &'static str,
        title: &'static str,
        description: &'static str,
        checked: bool,
        apply: fn(&mut crate::settings::Settings, bool),
        cx: &mut Context<Self>,
    ) -> impl IntoElement {
        h_flex()
            .items_start()
            .justify_between()
            .gap_4()
            .child(
                v_flex()
                    .flex_1()
                    .gap_0p5()
                    .child(div().text_sm().font_medium().child(title))
                    .child(
                        div()
                            .text_xs()
                            .text_color(cx.theme().muted_foreground)
                            .child(description),
                    ),
            )
            .child(
                Switch::new(id)
                    .checked(checked)
                    .accessibility_label(title)
                    .on_click(cx.listener(move |this, value: &bool, _window, cx| {
                        let value = *value;
                        this.update_setting(|settings| apply(settings, value), cx);
                    })),
            )
    }

    // ---- shared furniture -------------------------------------------------

    fn render_legend(&self, cx: &mut Context<Self>) -> impl IntoElement {
        h_flex()
            .gap_4()
            .flex_wrap()
            .justify_center()
            .child(self.render_hint("\u{2190}", "Toss", cx))
            .child(self.render_hint("\u{2192}", "Keep", cx))
            .child(self.render_hint("\u{2318}Z", "Undo", cx))
            .child(self.render_hint("I", "Details", cx))
            .child(self.render_hint("O", "Open", cx))
    }

    fn render_hint(
        &self,
        key: &'static str,
        label: &'static str,
        cx: &mut Context<Self>,
    ) -> impl IntoElement {
        h_flex()
            .items_center()
            .gap_1p5()
            .child(
                div()
                    .px_1p5()
                    .py_0p5()
                    .min_w(px(22.))
                    .rounded_md()
                    .border_1()
                    .border_color(cx.theme().border)
                    .bg(cx.theme().muted)
                    .text_xs()
                    .text_center()
                    .text_color(cx.theme().muted_foreground)
                    .child(key),
            )
            .child(
                div()
                    .text_xs()
                    .text_color(cx.theme().muted_foreground)
                    .child(label),
            )
    }

    fn render_banner(&mut self, cx: &mut Context<Self>) -> Option<impl IntoElement> {
        let Banner { text, tone } = self.banner.clone()?;

        let tint = match tone {
            Tone::Neutral => cx.theme().foreground,
            Tone::Problem => cx.theme().danger,
        };

        Some(
            div()
                .absolute()
                .bottom(px(24.))
                .left_0()
                .right_0()
                .flex()
                .justify_center()
                .child(
                    h_flex()
                        .items_center()
                        .gap_2()
                        .rounded_full()
                        .border_1()
                        .border_color(cx.theme().border)
                        .bg(cx.theme().popover)
                        .shadow_lg()
                        .px_4()
                        .py_2()
                        .text_sm()
                        .child(div().text_color(tint).child(match tone {
                            Tone::Neutral => IconName::Info,
                            Tone::Problem => IconName::TriangleAlert,
                        }))
                        .child(text),
                ),
        )
    }

    fn render_update_pill(&mut self, cx: &mut Context<Self>) -> Option<impl IntoElement> {
        let UpdateStatus::Available { version } = self.update.clone()? else {
            return None;
        };

        Some(
            div().absolute().bottom(px(24.)).right(px(24.)).child(
                h_flex()
                    .items_center()
                    .gap_3()
                    .rounded_full()
                    .border_1()
                    .border_color(cx.theme().border)
                    .bg(cx.theme().popover)
                    .shadow_lg()
                    .pl_4()
                    .pr_2()
                    .py_1p5()
                    .text_sm()
                    .child(format!("Version {version} is out"))
                    .child(
                        Button::new("get-update")
                            .ghost()
                            .xsmall()
                            .label("Get it")
                            .on_click(
                                cx.listener(|this, _, _window, cx| this.open_release_page(cx)),
                            ),
                    ),
            ),
        )
    }
}

fn kind_label(kind: FileKind) -> &'static str {
    match kind {
        FileKind::Image => "Image",
        FileKind::Document => "Document",
        FileKind::Video => "Video",
        FileKind::Other => "File",
    }
}

fn summary_line(tossed: usize, kept: usize) -> &'static str {
    if tossed > kept {
        "That folder is a lot lighter than it was."
    } else if kept > tossed {
        "Mostly keepers \u{2014} at least now you know."
    } else {
        "An even split. Decisive."
    }
}

/// "Sep 10, 2026 at 22:41" — the same information the Electron build's
/// `Intl.DateTimeFormat` produced, in local time.
pub fn format_modified(modified: &std::time::SystemTime) -> String {
    let datetime: chrono::DateTime<chrono::Local> = (*modified).into();
    datetime.format("%b %-d, %Y at %H:%M").to_string()
}
