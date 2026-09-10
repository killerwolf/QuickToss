//! Turning a file on disk into something you can look at.
//!
//! This module replaces five separate JavaScript preview components from the
//! Electron build — `PdfPreview` (pdfjs), `DocxPreview` (mammoth),
//! `SpreadsheetPreview` (SheetJS), `PptxPreview` (JSZip + a hand-rolled XML
//! walk) and `HeicPreview` (heic2any) — with the one macOS API that already
//! knows how to render every one of those formats: QuickLookThumbnailing.
//!
//! It is the same renderer Finder's Quick Look and the column-view preview
//! use, so a PowerPoint deck looks like the deck rather than like a list of
//! its text runs, and a Word document keeps its layout. The Electron build
//! reached for this too, but only for PPTX and only by shelling out to
//! `qlmanage` into a temp directory; here we call the framework directly.

use crate::files::{is_text_extension, FileItem, FileKind};
use anyhow::Result;
use std::path::Path;

/// Text previews are for glancing at, not for reading a 2GB log end to end.
/// The Electron build read the whole file into the renderer; this cap keeps a
/// runaway file from stalling the one decision you were trying to make.
const MAX_TEXT_BYTES: usize = 256 * 1024;

/// The longest edge, in points, we ask Quick Look to render. Generous enough
/// to stay sharp on a Retina display at full-window size.
const THUMBNAIL_MAX_EDGE: f64 = 1600.0;

/// What the viewer should put on screen for the current file.
pub enum Preview {
    /// Hand the path straight to GPUI's image element: it decodes and uploads
    /// to the GPU itself, and animates GIFs, without the bytes ever passing
    /// through our code.
    ImagePath,
    /// PNG bytes rendered by Quick Look.
    Rendered(Vec<u8>),
    Text {
        body: String,
        truncated: bool,
    },
    /// No preview to be had — the viewer falls back to an icon and the file's
    /// details, which is still enough to decide on.
    Unavailable,
}

/// Formats GPUI decodes natively. Handing it the path lets it own the decode
/// and the GPU upload; anything outside this list goes through Quick Look.
/// HEIC is the notable absentee — the `image` crate has no HEIC decoder, but
/// macOS does, and Quick Look reaches it.
fn decodes_natively(extension: &str) -> bool {
    matches!(
        extension,
        ".jpg" | ".jpeg" | ".png" | ".gif" | ".webp" | ".bmp"
    )
}

/// Work out how to preview a file. Runs off the main thread: Quick Look and
/// the filesystem both block, and neither should cost a dropped frame.
pub fn load(file: &FileItem) -> Preview {
    if file.kind == FileKind::Image && decodes_natively(&file.extension) {
        return Preview::ImagePath;
    }

    if is_text_extension(&file.extension) {
        return match read_text(&file.path) {
            Ok((body, truncated)) => Preview::Text { body, truncated },
            Err(_) => Preview::Unavailable,
        };
    }

    match thumbnail_png(&file.path, THUMBNAIL_MAX_EDGE) {
        Ok(bytes) => Preview::Rendered(bytes),
        Err(error) => {
            eprintln!("No Quick Look preview for {}: {error}", file.path.display());
            Preview::Unavailable
        }
    }
}

fn read_text(path: &Path) -> Result<(String, bool)> {
    let bytes = std::fs::read(path)?;
    let truncated = bytes.len() > MAX_TEXT_BYTES;
    let slice = if truncated {
        &bytes[..MAX_TEXT_BYTES]
    } else {
        &bytes[..]
    };

    // from_utf8_lossy rather than a hard error: a log file with one stray byte
    // in it is still worth showing.
    Ok((String::from_utf8_lossy(slice).into_owned(), truncated))
}

#[cfg(target_os = "macos")]
pub use macos::thumbnail_png;

#[cfg(not(target_os = "macos"))]
pub fn thumbnail_png(_path: &Path, _max_edge: f64) -> Result<Vec<u8>> {
    anyhow::bail!("Quick Look thumbnails are macOS-only")
}

#[cfg(target_os = "macos")]
mod macos {
    use anyhow::{anyhow, Result};
    use block2::RcBlock;
    use objc2::AllocAnyThread;
    use objc2_app_kit::{NSBitmapImageFileType, NSBitmapImageRep};
    use objc2_foundation::{NSDictionary, NSError, NSSize, NSString, NSURL};
    use objc2_quick_look_thumbnailing::{
        QLThumbnailGenerationRequest, QLThumbnailGenerationRequestRepresentationTypes,
        QLThumbnailGenerator, QLThumbnailRepresentation,
    };
    use std::path::Path;
    use std::sync::mpsc;
    use std::time::Duration;

    /// A file that takes longer than this to render isn't worth waiting on —
    /// the viewer falls back to an icon and you can still decide from the name
    /// and size. Without a bound, one pathological file would hang the queue.
    const TIMEOUT: Duration = Duration::from_secs(5);

    /// Ask macOS for a rendered preview of any file it knows how to draw:
    /// PDF, Word, Excel, PowerPoint, RTF, HEIC, video poster frames, and more.
    pub fn thumbnail_png(path: &Path, max_edge: f64) -> Result<Vec<u8>> {
        let (sender, receiver) = mpsc::channel::<Result<Vec<u8>, String>>();

        // SAFETY: every pointer below is either freshly created here or handed
        // to us by the framework inside its own completion handler, and each
        // is used only for the duration of the call it belongs to.
        unsafe {
            let url = NSURL::fileURLWithPath(&NSString::from_str(
                path.to_str()
                    .ok_or_else(|| anyhow!("path is not valid UTF-8"))?,
            ));

            let request =
                QLThumbnailGenerationRequest::initWithFileAtURL_size_scale_representationTypes(
                    QLThumbnailGenerationRequest::alloc(),
                    &url,
                    NSSize::new(max_edge, max_edge),
                    // Quick Look renders at size * scale. We already ask for a
                    // large size, so scale 1 keeps memory sane while staying sharp.
                    1.0,
                    QLThumbnailGenerationRequestRepresentationTypes::Thumbnail,
                );

            let handler = RcBlock::new(
                move |thumbnail: *mut QLThumbnailRepresentation, error: *mut NSError| {
                    let result = if let Some(thumbnail) = thumbnail.as_ref() {
                        encode_png(thumbnail)
                    } else if let Some(error) = error.as_ref() {
                        Err(error.localizedDescription().to_string())
                    } else {
                        Err("Quick Look returned neither a thumbnail nor an error".to_string())
                    };

                    // The receiver is gone if we already timed out; that's a
                    // normal race, not a failure worth reporting.
                    let _ = sender.send(result);
                },
            );

            QLThumbnailGenerator::sharedGenerator()
                .generateBestRepresentationForRequest_completionHandler(&request, &handler);
        }

        receiver
            .recv_timeout(TIMEOUT)
            .map_err(|_| anyhow!("Quick Look timed out after {TIMEOUT:?}"))?
            .map_err(|message| anyhow!(message))
    }

    /// Re-encode the thumbnail's CGImage as PNG so it can be handed to GPUI as
    /// plain bytes. NSBitmapImageRep is the shortest path that doesn't drag in
    /// ImageIO, and it is safe off the main thread — it draws no views.
    unsafe fn encode_png(thumbnail: &QLThumbnailRepresentation) -> Result<Vec<u8>, String> {
        let cg_image = thumbnail.CGImage();

        let rep = NSBitmapImageRep::initWithCGImage(NSBitmapImageRep::alloc(), &cg_image);

        let data = rep
            .representationUsingType_properties(NSBitmapImageFileType::PNG, &NSDictionary::new())
            .ok_or_else(|| "could not encode thumbnail as PNG".to_string())?;

        Ok(data.to_vec())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;
    use std::time::SystemTime;

    /// A valid 1x1 PNG. Small enough to inline, real enough that macOS will
    /// actually render it.
    const TINY_PNG: &[u8] = &[
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
        0x77, 0x53, 0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8,
        0xCF, 0xC0, 0x00, 0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB0, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
    ];

    fn scratch(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("quicktoss-preview-test-{name}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn item(path: PathBuf) -> FileItem {
        let extension = crate::files::extension_of(&path);
        FileItem {
            name: path.file_name().unwrap().to_string_lossy().into_owned(),
            size: fs::metadata(&path).map(|m| m.len()).unwrap_or(0),
            modified: SystemTime::UNIX_EPOCH,
            kind: crate::files::file_kind(&extension),
            extension,
            path,
        }
    }

    #[test]
    fn a_png_is_handed_straight_to_the_renderer() {
        let path = scratch("png").join("pixel.png");
        fs::write(&path, TINY_PNG).unwrap();

        assert!(matches!(load(&item(path)), Preview::ImagePath));
    }

    #[test]
    fn heic_does_not_take_the_native_decode_path() {
        // The whole reason Quick Look is here: the Rust image decoders have no
        // HEIC support, and macOS does.
        assert!(!decodes_natively(".heic"));
        assert!(decodes_natively(".jpg"));
    }

    #[test]
    fn a_text_file_comes_back_as_text() {
        let path = scratch("text").join("notes.md");
        fs::write(&path, b"# Title\n\nbody\n").unwrap();

        match load(&item(path)) {
            Preview::Text { body, truncated } => {
                assert!(body.contains("# Title"));
                assert!(!truncated);
            }
            _ => panic!("expected a text preview"),
        }
    }

    #[test]
    fn an_oversized_text_file_is_truncated_rather_than_loaded_whole() {
        let path = scratch("big-text").join("huge.log").to_path_buf();
        fs::write(&path, "x".repeat(MAX_TEXT_BYTES * 2)).unwrap();

        match load(&item(path)) {
            Preview::Text { body, truncated } => {
                assert!(truncated);
                assert_eq!(body.len(), MAX_TEXT_BYTES);
            }
            _ => panic!("expected a text preview"),
        }
    }

    #[test]
    fn a_file_that_is_gone_degrades_instead_of_failing() {
        let missing = scratch("missing").join("nothing.txt");

        assert!(matches!(load(&item(missing)), Preview::Unavailable));
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn quick_look_renders_a_real_file_to_png_bytes() {
        // Exercises the whole bridge: QLThumbnailGenerator's async completion
        // handler, the CGImage it hands back, and the PNG re-encode.
        let path = scratch("quicklook").join("pixel.png");
        fs::write(&path, TINY_PNG).unwrap();

        let bytes = thumbnail_png(&path, 256.0).expect("Quick Look should render a PNG");

        assert!(!bytes.is_empty());
        assert_eq!(
            &bytes[..8],
            &[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
            "expected PNG magic bytes"
        );
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn quick_look_reports_a_failure_rather_than_hanging() {
        let path = scratch("quicklook-missing").join("nothing.pdf");

        assert!(thumbnail_png(&path, 256.0).is_err());
    }
}
