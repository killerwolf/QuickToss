//! User settings, stored as JSON next to where the Electron build kept them.
//!
//! Port of `electron/settings-store.ts`. The on-disk path and key names are
//! deliberately unchanged, so anyone upgrading from the Electron build keeps
//! the preferences they already set.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Settings {
    /// Audio feedback on each decision.
    #[serde(rename = "soundEffects", default = "yes")]
    pub sound_effects: bool,

    /// Ask before moving a file to the Trash. On by default, because the
    /// keyboard shortcuts are fast enough to fire by accident.
    #[serde(rename = "confirmDelete", default = "yes")]
    pub confirm_toss: bool,
}

fn yes() -> bool {
    true
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            sound_effects: true,
            confirm_toss: true,
        }
    }
}

/// `~/Library/Application Support/QuickToss/settings.json` on macOS — the same
/// file Electron's `app.getPath("userData")` resolved to.
pub fn default_path() -> Option<PathBuf> {
    dirs::config_dir().map(|dir| dir.join("QuickToss").join("settings.json"))
}

/// Read settings, falling back to defaults for anything missing.
///
/// A malformed or unreadable file is not worth interrupting the user over —
/// they came here to clear out a folder, not to debug a config file — so it
/// degrades to defaults and says so in the log.
pub fn load(path: &Path) -> Settings {
    let Ok(contents) = fs::read_to_string(path) else {
        return Settings::default();
    };

    match serde_json::from_str(&contents) {
        Ok(settings) => settings,
        Err(error) => {
            eprintln!(
                "Ignoring unreadable settings at {}: {error}",
                path.display()
            );
            Settings::default()
        }
    }
}

pub fn save(path: &Path, settings: &Settings) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("creating settings directory {}", parent.display()))?;
    }

    let json = serde_json::to_string_pretty(settings)?;
    fs::write(path, json).with_context(|| format!("writing settings to {}", path.display()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_file(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("quicktoss-settings-test-{name}"));
        let _ = fs::remove_dir_all(&dir);
        dir.join("settings.json")
    }

    #[test]
    fn missing_file_yields_defaults() {
        let settings = load(&temp_file("missing"));
        assert_eq!(settings, Settings::default());
    }

    #[test]
    fn round_trips_through_disk() {
        let path = temp_file("round-trip");
        let written = Settings {
            sound_effects: false,
            confirm_toss: false,
        };

        save(&path, &written).unwrap();

        assert_eq!(load(&path), written);
        let _ = fs::remove_dir_all(path.parent().unwrap());
    }

    #[test]
    fn reads_settings_written_by_the_electron_build() {
        // The old app wrote three camelCase keys. videoAutoplay no longer has
        // anything to control, but its presence must not stop the other two
        // from being honoured.
        let path = temp_file("electron-format");
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(
            &path,
            r#"{"soundEffects": false, "videoAutoplay": true, "confirmDelete": false}"#,
        )
        .unwrap();

        let settings = load(&path);

        assert!(!settings.sound_effects);
        assert!(!settings.confirm_toss);
        let _ = fs::remove_dir_all(path.parent().unwrap());
    }

    #[test]
    fn malformed_json_degrades_to_defaults() {
        let path = temp_file("malformed");
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(&path, "{not json").unwrap();

        assert_eq!(load(&path), Settings::default());
        let _ = fs::remove_dir_all(path.parent().unwrap());
    }
}
