//! The triage session: which files are left, what you decided about each one,
//! and the undo stack behind `Cmd+Z`.
//!
//! Port of the old `src/hooks/useFileSession.ts`. It is deliberately free of
//! any GPUI or filesystem dependency — the trash call lives in the view layer
//! and only calls `record_toss` once the file has actually moved, so a failed
//! trash operation can never be recorded as if it had succeeded.

use crate::files::FileItem;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Decision {
    Toss,
    Keep,
}

/// One entry on the undo stack: what you decided, and where in the queue you
/// were when you decided it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DecisionRecord {
    pub decision: Decision,
    pub file_index: usize,
    pub file: FileItem,
}

#[derive(Debug, Default)]
pub struct Session {
    pub files: Vec<FileItem>,
    pub current_index: usize,
    pub tossed: Vec<FileItem>,
    pub kept: Vec<FileItem>,
    pub folder_path: Option<std::path::PathBuf>,
    pub undo_stack: Vec<DecisionRecord>,
}

impl Session {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn start(&mut self, files: Vec<FileItem>, folder_path: std::path::PathBuf) {
        *self = Session {
            files,
            folder_path: Some(folder_path),
            ..Session::default()
        };
    }

    pub fn reset(&mut self) {
        *self = Session::default();
    }

    pub fn current(&self) -> Option<&FileItem> {
        self.files.get(self.current_index)
    }

    /// A fresh, never-started session isn't "complete" just because
    /// `current_index` (0) already meets `files.len()` (0).
    pub fn is_complete(&self) -> bool {
        !self.files.is_empty() && self.current_index >= self.files.len()
    }

    pub fn can_undo(&self) -> bool {
        !self.undo_stack.is_empty()
    }

    /// How far through the queue you are, as 0.0..=1.0, for the progress bar.
    pub fn progress(&self) -> f32 {
        if self.files.is_empty() {
            return 0.0;
        }
        (self.current_index as f32 / self.files.len() as f32).clamp(0.0, 1.0)
    }

    pub fn keep(&mut self) {
        let Some(file) = self.current().cloned() else {
            return;
        };

        self.kept.push(file.clone());
        self.undo_stack.push(DecisionRecord {
            decision: Decision::Keep,
            file_index: self.current_index,
            file,
        });
        self.current_index += 1;
    }

    /// Commit a toss that has already happened on disk.
    ///
    /// `file_index` is passed in rather than read from `self` because the
    /// trash operation is awaited first: by the time it returns, the caller's
    /// notion of "the file I acted on" is the authority, not wherever the
    /// session happens to be pointing.
    pub fn record_toss(&mut self, file_index: usize, file: FileItem) {
        self.tossed.push(file.clone());
        self.undo_stack.push(DecisionRecord {
            decision: Decision::Toss,
            file_index,
            file,
        });
        self.current_index = file_index + 1;
    }

    /// Undo the last decision.
    ///
    /// Undoing a toss doesn't pull the file back out of the Trash — that can't
    /// be automated reliably — it only stops counting it as tossed and puts it
    /// back in front of you as undecided. The file itself is one drag out of
    /// the Trash, which is the recovery path the app has always relied on.
    pub fn undo(&mut self) -> Option<DecisionRecord> {
        let record = self.undo_stack.pop()?;

        let bucket = match record.decision {
            Decision::Toss => &mut self.tossed,
            Decision::Keep => &mut self.kept,
        };
        bucket.retain(|f| f.path != record.file.path);

        self.current_index = record.file_index;
        Some(record)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::files::FileKind;
    use std::path::PathBuf;
    use std::time::SystemTime;

    fn file(name: &str) -> FileItem {
        FileItem {
            name: name.to_string(),
            path: PathBuf::from(format!("/folder/{name}")),
            size: 100,
            modified: SystemTime::UNIX_EPOCH,
            extension: ".txt".to_string(),
            kind: FileKind::Document,
        }
    }

    fn started(names: &[&str]) -> Session {
        let mut session = Session::new();
        session.start(
            names.iter().map(|n| file(n)).collect(),
            PathBuf::from("/folder"),
        );
        session
    }

    #[test]
    fn fresh_session_is_not_complete() {
        assert!(!Session::new().is_complete());
    }

    #[test]
    fn is_complete_only_after_the_last_file() {
        let mut session = started(&["a.txt", "b.txt"]);
        assert!(!session.is_complete());

        session.keep();
        assert!(!session.is_complete());

        session.keep();
        assert!(session.is_complete());
    }

    #[test]
    fn undoing_the_last_file_reopens_the_session() {
        let mut session = started(&["a.txt"]);
        session.keep();
        assert!(session.is_complete());

        session.undo();
        assert!(!session.is_complete());
    }

    #[test]
    fn start_sets_up_a_fresh_session_at_index_zero() {
        let session = started(&["a.txt", "b.txt"]);

        assert_eq!(session.files.len(), 2);
        assert_eq!(session.current_index, 0);
        assert_eq!(session.folder_path, Some(PathBuf::from("/folder")));
        assert!(session.tossed.is_empty());
        assert!(session.kept.is_empty());
        assert!(session.undo_stack.is_empty());
    }

    #[test]
    fn keep_advances_and_records_an_undo_entry() {
        let mut session = started(&["a.txt", "b.txt"]);

        session.keep();

        assert_eq!(session.kept, vec![file("a.txt")]);
        assert_eq!(session.current_index, 1);
        assert_eq!(
            session.undo_stack,
            vec![DecisionRecord {
                decision: Decision::Keep,
                file_index: 0,
                file: file("a.txt"),
            }]
        );
    }

    #[test]
    fn record_toss_commits_and_advances() {
        let mut session = started(&["a.txt", "b.txt"]);

        session.record_toss(0, file("a.txt"));

        assert_eq!(session.tossed, vec![file("a.txt")]);
        assert_eq!(session.current_index, 1);
        assert_eq!(
            session.undo_stack,
            vec![DecisionRecord {
                decision: Decision::Toss,
                file_index: 0,
                file: file("a.txt"),
            }]
        );
    }

    #[test]
    fn a_toss_that_never_reaches_record_toss_leaves_no_trace() {
        // Stands in for a failed `move_to_trash`: the view layer returns early
        // without calling record_toss, and the session is untouched.
        let session = started(&["a.txt"]);

        assert!(session.tossed.is_empty());
        assert_eq!(session.current_index, 0);
        assert!(session.undo_stack.is_empty());
    }

    #[test]
    fn undo_reverses_a_keep() {
        let mut session = started(&["a.txt"]);
        session.keep();

        session.undo();

        assert!(session.kept.is_empty());
        assert_eq!(session.current_index, 0);
        assert!(session.undo_stack.is_empty());
    }

    #[test]
    fn undo_reverses_a_toss_bookkeeping_without_restoring_the_file() {
        let mut session = started(&["a.txt"]);
        session.record_toss(0, file("a.txt"));

        session.undo();

        assert!(session.tossed.is_empty());
        assert_eq!(session.current_index, 0);
        assert!(session.undo_stack.is_empty());
    }

    #[test]
    fn undo_is_a_no_op_with_nothing_to_undo() {
        let mut session = started(&["a.txt"]);

        assert!(session.undo().is_none());
        assert_eq!(session.current_index, 0);
    }

    #[test]
    fn reset_clears_the_session() {
        let mut session = started(&["a.txt"]);
        session.keep();

        session.reset();

        assert!(session.files.is_empty());
        assert_eq!(session.folder_path, None);
        assert!(session.kept.is_empty());
    }

    #[test]
    fn progress_tracks_position_through_the_queue() {
        let mut session = started(&["a.txt", "b.txt", "c.txt", "d.txt"]);
        assert_eq!(session.progress(), 0.0);

        session.keep();
        assert_eq!(session.progress(), 0.25);

        session.keep();
        session.keep();
        session.keep();
        assert_eq!(session.progress(), 1.0);
    }
}
