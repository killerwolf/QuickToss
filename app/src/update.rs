//! Checking whether a newer QuickToss has been released.
//!
//! Port of `electron/updater.ts`. That file configured `electron-updater` with
//! `autoDownload = false` and `autoInstallOnAppQuit = false`, because
//! installing in place needs a Developer ID signature the project doesn't have
//! yet — so all it ever really did was compare versions and offer a link. That
//! is exactly what this does, in one request, with no updater framework
//! attached.

use anyhow::{anyhow, Result};
use serde::Deserialize;
use std::time::Duration;

const RELEASES_URL: &str = "https://github.com/killerwolf/QuickToss/releases";
const LATEST_RELEASE_API: &str =
    "https://api.github.com/repos/killerwolf/QuickToss/releases/latest";
const TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum UpdateStatus {
    UpToDate,
    Available { version: String },
}

impl UpdateStatus {
    /// Where to send someone who wants the new version. Built here rather than
    /// passed in from the view, so no part of the UI can ask the app to open an
    /// arbitrary link.
    pub fn release_url(&self) -> String {
        match self {
            UpdateStatus::Available { version } => format!("{RELEASES_URL}/tag/v{version}"),
            UpdateStatus::UpToDate => format!("{RELEASES_URL}/latest"),
        }
    }
}

#[derive(Deserialize)]
struct Release {
    tag_name: String,
}

/// Ask GitHub for the latest release. Blocking — call it off the main thread.
pub fn check(current_version: &str) -> Result<UpdateStatus> {
    let response = ureq::get(LATEST_RELEASE_API)
        .config()
        .timeout_global(Some(TIMEOUT))
        .build()
        .header("User-Agent", "QuickToss")
        .header("Accept", "application/vnd.github+json")
        .call()?
        .body_mut()
        .read_json::<Release>()?;

    let latest = response.tag_name.trim_start_matches('v').to_string();

    if is_newer(&latest, current_version)? {
        Ok(UpdateStatus::Available { version: latest })
    } else {
        Ok(UpdateStatus::UpToDate)
    }
}

/// Numeric, component-wise version comparison.
///
/// Deliberately not a semver dependency: these are our own tags, they are
/// always `MAJOR.MINOR.PATCH`, and a whole crate to compare three integers
/// would be the sort of thing this migration is trying to get away from.
fn is_newer(candidate: &str, current: &str) -> Result<bool> {
    let parse = |version: &str| -> Result<Vec<u32>> {
        version
            .split('.')
            .map(|part| {
                part.trim()
                    .parse::<u32>()
                    .map_err(|_| anyhow!("unparseable version {version:?}"))
            })
            .collect()
    };

    Ok(parse(candidate)? > parse(current)?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compares_versions_numerically_not_lexically() {
        // The case a string comparison gets wrong: "10" < "9" as text.
        assert!(is_newer("1.10.0", "1.9.0").unwrap());
        assert!(!is_newer("1.9.0", "1.10.0").unwrap());
    }

    #[test]
    fn an_identical_version_is_not_an_update() {
        assert!(!is_newer("1.5.0", "1.5.0").unwrap());
    }

    #[test]
    fn recognises_each_component() {
        assert!(is_newer("2.0.0", "1.9.9").unwrap());
        assert!(is_newer("1.6.0", "1.5.9").unwrap());
        assert!(is_newer("1.5.1", "1.5.0").unwrap());
    }

    #[test]
    fn rejects_a_tag_it_cannot_read() {
        assert!(is_newer("not-a-version", "1.0.0").is_err());
    }

    #[test]
    fn links_to_the_tagged_release_when_one_is_available() {
        let status = UpdateStatus::Available {
            version: "1.6.0".to_string(),
        };
        assert!(status.release_url().ends_with("/releases/tag/v1.6.0"));
        assert!(UpdateStatus::UpToDate.release_url().ends_with("/latest"));
    }
}
