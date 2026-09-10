//! Everything QuickToss knows about the files on disk: which ones it will show
//! you, how it describes them, and how it gets rid of them.
//!
//! This is the Rust port of the old `electron/file-types.ts` and
//! `electron/file-operations.ts`. Those two lived in the main process and were
//! reachable only over IPC; here they are ordinary functions, so the extension
//! tables and the scan that uses them finally sit in one place.

use anyhow::{Context, Result};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

/// Extensions are compared lowercase; callers normalise before looking up.
pub const IMAGE_EXTENSIONS: &[&str] = &[
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".bmp", ".tiff",
];

pub const DOCUMENT_EXTENSIONS: &[&str] = &[
    ".pdf", ".txt", ".rtf", ".md", ".log", ".json", ".xml", ".csv", ".yaml", ".yml", ".doc",
    ".docx", ".pptx", ".xlsx",
];

pub const VIDEO_EXTENSIONS: &[&str] = &[".mp4", ".mov", ".avi"];

/// Document extensions whose bytes are readable as text. Everything else in
/// `DOCUMENT_EXTENSIONS` is a container format and goes through Quick Look.
pub const TEXT_EXTENSIONS: &[&str] = &[
    ".txt", ".md", ".log", ".json", ".xml", ".yaml", ".yml", ".csv",
];

/// The broad category a file falls into, which decides the icon and the
/// fallback copy when no preview can be produced.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FileKind {
    Image,
    Document,
    Video,
    Other,
}

impl FileKind {
    pub fn label(self) -> &'static str {
        match self {
            FileKind::Image => "image",
            FileKind::Document => "document",
            FileKind::Video => "video",
            FileKind::Other => "other",
        }
    }
}

pub fn file_kind(extension: &str) -> FileKind {
    let ext = extension.to_lowercase();
    if IMAGE_EXTENSIONS.contains(&ext.as_str()) {
        FileKind::Image
    } else if DOCUMENT_EXTENSIONS.contains(&ext.as_str()) {
        FileKind::Document
    } else if VIDEO_EXTENSIONS.contains(&ext.as_str()) {
        FileKind::Video
    } else {
        FileKind::Other
    }
}

/// Derived from the category lists rather than maintained separately, so an
/// extension can't be scannable without also having a kind (or vice versa).
pub fn is_supported_extension(extension: &str) -> bool {
    let ext = extension.to_lowercase();
    IMAGE_EXTENSIONS.contains(&ext.as_str())
        || DOCUMENT_EXTENSIONS.contains(&ext.as_str())
        || VIDEO_EXTENSIONS.contains(&ext.as_str())
}

pub fn is_text_extension(extension: &str) -> bool {
    TEXT_EXTENSIONS.contains(&extension.to_lowercase().as_str())
}

/// One file in the queue. Cheap to clone — the undo stack and the kept/tossed
/// tallies each hold their own copy.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FileItem {
    pub name: String,
    pub path: PathBuf,
    pub size: u64,
    pub modified: SystemTime,
    pub extension: String,
    pub kind: FileKind,
}

/// The leading-dot, lowercased extension, or "" for a file that has none.
/// Matching the old `entry.substring(entry.lastIndexOf("."))` shape means the
/// extension tables above port over unchanged.
pub fn extension_of(path: &Path) -> String {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| format!(".{}", ext.to_lowercase()))
        .unwrap_or_default()
}

/// Scan a folder for the files QuickToss can show, newest first.
///
/// Unreadable entries are skipped rather than failing the whole scan: one file
/// with broken permissions shouldn't cost you the other two hundred.
pub fn scan_folder(folder: &Path) -> Result<Vec<FileItem>> {
    let entries =
        fs::read_dir(folder).with_context(|| format!("scanning folder {}", folder.display()))?;

    let mut files: Vec<FileItem> = entries
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| {
            let path = entry.path();
            let metadata = entry.metadata().ok()?;
            if !metadata.is_file() {
                return None;
            }

            let extension = extension_of(&path);
            if !is_supported_extension(&extension) {
                return None;
            }

            Some(FileItem {
                name: entry.file_name().to_string_lossy().into_owned(),
                size: metadata.len(),
                modified: metadata.modified().unwrap_or(SystemTime::UNIX_EPOCH),
                kind: file_kind(&extension),
                extension,
                path,
            })
        })
        .collect();

    // Newest first: the most recent downloads are the ones you have the
    // clearest opinion about, so they make for the fastest first decisions.
    files.sort_by(|a, b| {
        b.modified
            .cmp(&a.modified)
            .then_with(|| a.name.cmp(&b.name))
    });

    Ok(files)
}

/// Move a file to the system Trash. Never a permanent delete — recovering a
/// mistake is a matter of opening the Trash, which is what makes the whole
/// swipe-fast premise safe.
pub fn move_to_trash(path: &Path) -> Result<()> {
    trash::delete(path).with_context(|| format!("moving {} to trash", path.display()))
}

const SIZE_UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];

/// Human-readable file size, rounded to two decimals.
///
/// The unit index is clamped: without that, anything >= 1TB indexed past the
/// end of the unit table and rendered as "1 undefined" in the old JS.
pub fn format_size(bytes: u64) -> String {
    if bytes == 0 {
        return "0 B".to_string();
    }

    let exponent = ((bytes as f64).log(1024.0).floor() as usize).min(SIZE_UNITS.len() - 1);
    let value = bytes as f64 / 1024f64.powi(exponent as i32);
    let rounded = (value * 100.0).round() / 100.0;

    // Trailing zeros read as noise on a line that is already dense, so "1.5 MB"
    // rather than "1.50 MB" and "2 KB" rather than "2.00 KB".
    if (rounded.fract()).abs() < f64::EPSILON {
        format!("{} {}", rounded as u64, SIZE_UNITS[exponent])
    } else {
        format!("{} {}", rounded, SIZE_UNITS[exponent])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn categorises_by_extension() {
        assert_eq!(file_kind(".png"), FileKind::Image);
        assert_eq!(file_kind(".PNG"), FileKind::Image);
        assert_eq!(file_kind(".pdf"), FileKind::Document);
        assert_eq!(file_kind(".mov"), FileKind::Video);
        assert_eq!(file_kind(".dmg"), FileKind::Other);
    }

    #[test]
    fn every_supported_extension_has_a_kind() {
        // The guarantee the old TypeScript got from deriving SUPPORTED_EXTENSIONS
        // off the category lists: nothing can be scannable without a kind.
        for extension in IMAGE_EXTENSIONS
            .iter()
            .chain(DOCUMENT_EXTENSIONS)
            .chain(VIDEO_EXTENSIONS)
        {
            assert!(
                is_supported_extension(extension),
                "{extension} not supported"
            );
            assert_ne!(
                file_kind(extension),
                FileKind::Other,
                "{extension} has no kind"
            );
        }
    }

    #[test]
    fn extension_is_lowercased_and_dotted() {
        assert_eq!(extension_of(Path::new("/a/Photo.JPEG")), ".jpeg");
        assert_eq!(extension_of(Path::new("/a/archive.tar.gz")), ".gz");
    }

    #[test]
    fn a_file_with_no_extension_has_none_and_is_not_supported() {
        assert_eq!(extension_of(Path::new("/a/README")), "");
        assert!(!is_supported_extension(""));
    }

    #[test]
    fn formats_sizes_against_the_right_unit() {
        assert_eq!(format_size(0), "0 B");
        assert_eq!(format_size(512), "512 B");
        assert_eq!(format_size(1024), "1 KB");
        assert_eq!(format_size(1536), "1.5 KB");
        assert_eq!(format_size(5 * 1024 * 1024), "5 MB");
    }

    #[test]
    fn clamps_the_unit_instead_of_running_off_the_end_of_the_table() {
        // The old JS indexed past its unit array here and rendered "1 undefined".
        let petabyte = 1024u64.pow(5);
        assert!(
            format_size(petabyte).ends_with(" TB"),
            "got {}",
            format_size(petabyte)
        );
    }

    #[test]
    fn scan_keeps_supported_files_newest_first_and_ignores_the_rest() {
        use std::fs;
        use std::time::Duration;

        let dir = std::env::temp_dir().join("quicktoss-scan-test");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        fs::create_dir_all(dir.join("a-subfolder")).unwrap();

        fs::write(dir.join("older.txt"), b"old").unwrap();
        std::thread::sleep(Duration::from_millis(20));
        fs::write(dir.join("newer.png"), b"new").unwrap();
        fs::write(dir.join("ignored.dmg"), b"nope").unwrap();

        let found = scan_folder(&dir).unwrap();

        let names: Vec<_> = found.iter().map(|f| f.name.as_str()).collect();
        assert_eq!(names, vec!["newer.png", "older.txt"]);

        let _ = fs::remove_dir_all(&dir);
    }
}
