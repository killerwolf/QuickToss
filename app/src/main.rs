//! QuickToss — clean out a cluttered folder the way you'd swipe through a
//! dating app: one file at a time, left to toss, right to keep.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod files;
mod preview;
mod session;
mod settings;
mod sound;
mod ui;
mod update;

use gpui_kit::component::{Root, Theme};
use gpui_kit::*;

use app::{
    ChooseFolder, Dismiss, Keep, OpenExternally, QuickToss, StartOver, ToggleDetails,
    ToggleSettings, Toss, Undo, KEY_CONTEXT,
};

actions!(quicktoss, [Quit]);

/// The keys, unchanged from the Electron build, plus `O` to open the file in
/// whatever app owns it — the escape hatch for anything QuickToss can't draw.
fn key_bindings() -> Vec<KeyBinding> {
    let context = Some(KEY_CONTEXT);

    vec![
        KeyBinding::new("left", Toss, context),
        KeyBinding::new("backspace", Toss, context),
        KeyBinding::new("right", Keep, context),
        KeyBinding::new("space", Keep, context),
        KeyBinding::new("cmd-z", Undo, context),
        KeyBinding::new("i", ToggleDetails, context),
        KeyBinding::new("o", OpenExternally, context),
        KeyBinding::new("cmd-o", ChooseFolder, context),
        KeyBinding::new("cmd-,", ToggleSettings, context),
        KeyBinding::new("escape", Dismiss, context),
        KeyBinding::new("cmd-shift-o", StartOver, context),
    ]
}

fn window_options(cx: &mut App) -> WindowOptions {
    WindowOptions {
        window_bounds: Some(WindowBounds::Windowed(Bounds::centered(
            None,
            size(px(1100.), px(760.)),
            cx,
        ))),
        titlebar: Some(TitlebarOptions {
            title: Some("QuickToss".into()),
            ..Default::default()
        }),
        window_min_size: Some(size(px(720.), px(560.))),
        ..Default::default()
    }
}

fn main() {
    gpui_kit::application()
        .with_assets(gpui_kit::assets::Assets)
        .run(|cx: &mut App| {
            gpui_kit::init(cx);
            cx.bind_keys(key_bindings());

            cx.on_action(|_: &Quit, cx: &mut App| cx.quit());
            cx.bind_keys([KeyBinding::new("cmd-q", Quit, None)]);
            cx.set_menus(vec![Menu {
                name: "QuickToss".into(),
                items: vec![MenuItem::action("Quit QuickToss", Quit)],
                disabled: false,
            }]);

            let options = window_options(cx);

            cx.spawn(async move |cx| {
                cx.open_window(options, |window, cx| {
                    // Follow the system's light/dark setting rather than
                    // picking one: the app is a neutral frame around someone
                    // else's files, and should sit where the rest of the
                    // desktop sits.
                    Theme::sync_system_appearance(Some(window), cx);

                    let view = cx.new(QuickToss::new);
                    let focus_handle = view.read(cx).focus_handle.clone();
                    window.focus(&focus_handle, cx);

                    cx.new(|cx| Root::new(AnyView::from(view), window, cx))
                })
                .expect("failed to open the QuickToss window");
            })
            .detach();

            cx.activate(true);
        });
}
