import { useCallback, useState } from "react";
import type { FileItem, SessionState, UndoAction } from "../types";

const EMPTY_SESSION: SessionState = {
  files: [],
  currentIndex: 0,
  deletedFiles: [],
  keptFiles: [],
  folderPath: "",
  undoStack: [],
};

function applyKeep(prev: SessionState): SessionState {
  const file = prev.files[prev.currentIndex];
  if (!file) return prev;

  const action: UndoAction = { action: "keep", fileIndex: prev.currentIndex, file };
  return {
    ...prev,
    keptFiles: [...prev.keptFiles, file],
    undoStack: [...prev.undoStack, action],
    currentIndex: prev.currentIndex + 1,
  };
}

function applyDelete(prev: SessionState, fileIndex: number, file: FileItem): SessionState {
  const action: UndoAction = { action: "delete", fileIndex, file };
  return {
    ...prev,
    deletedFiles: [...prev.deletedFiles, file],
    undoStack: [...prev.undoStack, action],
    currentIndex: fileIndex + 1,
  };
}

function applyUndo(prev: SessionState): SessionState {
  if (prev.undoStack.length === 0) return prev;

  const lastAction = prev.undoStack[prev.undoStack.length - 1];
  // Undoing a delete doesn't restore the file from trash — it can't be
  // automated — it only removes it from the deleted list so it's tracked as
  // "not yet decided" again.
  const field = lastAction.action === "delete" ? "deletedFiles" : "keptFiles";

  return {
    ...prev,
    undoStack: prev.undoStack.slice(0, -1),
    [field]: prev[field].filter((f) => f.path !== lastAction.file.path),
    currentIndex: lastAction.fileIndex,
  };
}

// Owns the whole triage session: which files are left, which were kept or
// deleted, and the undo stack. deleteFile is the one async method — it awaits
// moveToTrash and only commits the "deleted" transition on success, so a
// failed trash operation can never be recorded as if it succeeded. Callers
// (FileViewer) are expected to catch a rejection and surface it.
export function useFileSession() {
  const [sessionState, setSessionState] = useState<SessionState>(EMPTY_SESSION);

  const startSession = useCallback((files: FileItem[], folderPath: string) => {
    setSessionState({ ...EMPTY_SESSION, files, folderPath });
  }, []);

  const reset = useCallback(() => {
    setSessionState(EMPTY_SESSION);
  }, []);

  const keep = useCallback(() => {
    setSessionState(applyKeep);
  }, []);

  const deleteFile = useCallback(async () => {
    const { currentIndex, files } = sessionState;
    const file = files[currentIndex];
    if (!file) return;

    await window.electronAPI.moveToTrash(file.path);

    setSessionState((prev) => applyDelete(prev, currentIndex, file));
  }, [sessionState]);

  const undo = useCallback(() => {
    setSessionState(applyUndo);
  }, []);

  // A fresh (never-started) session isn't "complete" just because
  // currentIndex (0) already meets files.length (0).
  const isComplete =
    sessionState.files.length > 0 && sessionState.currentIndex >= sessionState.files.length;

  return { sessionState, isComplete, startSession, keep, deleteFile, undo, reset };
}
