import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FileItem } from "../types";
import { useFileSession } from "./useFileSession";

const file = (name: string): FileItem => ({
  name,
  path: `/folder/${name}`,
  size: 100,
  modified: new Date("2024-01-01"),
  extension: ".txt",
  type: "document",
});

let moveToTrash: ReturnType<typeof vi.fn>;

beforeEach(() => {
  moveToTrash = vi.fn().mockResolvedValue(true);
  window.electronAPI = { moveToTrash } as unknown as typeof window.electronAPI;
});

describe("isComplete", () => {
  it("is false for a fresh, never-started session", () => {
    const { result } = renderHook(() => useFileSession());
    expect(result.current.isComplete).toBe(false);
  });

  it("is false until the last file is processed, then true", () => {
    const { result } = renderHook(() => useFileSession());
    act(() => result.current.startSession([file("a.txt"), file("b.txt")], "/folder"));
    expect(result.current.isComplete).toBe(false);

    act(() => result.current.keep());
    expect(result.current.isComplete).toBe(false);

    act(() => result.current.keep());
    expect(result.current.isComplete).toBe(true);
  });

  it("goes back to false after undoing the last file", () => {
    const { result } = renderHook(() => useFileSession());
    act(() => result.current.startSession([file("a.txt")], "/folder"));
    act(() => result.current.keep());
    expect(result.current.isComplete).toBe(true);

    act(() => result.current.undo());
    expect(result.current.isComplete).toBe(false);
  });
});

describe("startSession", () => {
  it("sets up a fresh session at index 0", () => {
    const { result } = renderHook(() => useFileSession());

    act(() => {
      result.current.startSession([file("a.txt"), file("b.txt")], "/folder");
    });

    expect(result.current.sessionState.files).toHaveLength(2);
    expect(result.current.sessionState.currentIndex).toBe(0);
    expect(result.current.sessionState.folderPath).toBe("/folder");
    expect(result.current.sessionState.deletedFiles).toEqual([]);
    expect(result.current.sessionState.keptFiles).toEqual([]);
    expect(result.current.sessionState.undoStack).toEqual([]);
  });
});

describe("keep", () => {
  it("moves the current file to keptFiles, advances the index, and records an undo entry", () => {
    const { result } = renderHook(() => useFileSession());
    act(() => result.current.startSession([file("a.txt"), file("b.txt")], "/folder"));

    act(() => result.current.keep());

    expect(result.current.sessionState.keptFiles.map((f) => f.name)).toEqual(["a.txt"]);
    expect(result.current.sessionState.currentIndex).toBe(1);
    expect(result.current.sessionState.undoStack).toEqual([
      { action: "keep", fileIndex: 0, file: file("a.txt") },
    ]);
  });
});

describe("deleteFile", () => {
  it("moves the file to trash, then commits it to deletedFiles and advances the index", async () => {
    const { result } = renderHook(() => useFileSession());
    act(() => result.current.startSession([file("a.txt"), file("b.txt")], "/folder"));

    await act(async () => {
      await result.current.deleteFile();
    });

    expect(moveToTrash).toHaveBeenCalledWith("/folder/a.txt");
    expect(result.current.sessionState.deletedFiles.map((f) => f.name)).toEqual(["a.txt"]);
    expect(result.current.sessionState.currentIndex).toBe(1);
    expect(result.current.sessionState.undoStack).toEqual([
      { action: "delete", fileIndex: 0, file: file("a.txt") },
    ]);
  });

  it("does not commit the deletion when moveToTrash fails", async () => {
    moveToTrash.mockRejectedValue(new Error("permission denied"));
    const { result } = renderHook(() => useFileSession());
    act(() => result.current.startSession([file("a.txt")], "/folder"));

    await act(async () => {
      await expect(result.current.deleteFile()).rejects.toThrow("permission denied");
    });

    expect(result.current.sessionState.deletedFiles).toEqual([]);
    expect(result.current.sessionState.currentIndex).toBe(0);
    expect(result.current.sessionState.undoStack).toEqual([]);
  });
});

describe("undo", () => {
  it("reverses a keep", () => {
    const { result } = renderHook(() => useFileSession());
    act(() => result.current.startSession([file("a.txt")], "/folder"));
    act(() => result.current.keep());

    act(() => result.current.undo());

    expect(result.current.sessionState.keptFiles).toEqual([]);
    expect(result.current.sessionState.currentIndex).toBe(0);
    expect(result.current.sessionState.undoStack).toEqual([]);
  });

  it("reverses a delete's bookkeeping without restoring the file from trash", async () => {
    const { result } = renderHook(() => useFileSession());
    act(() => result.current.startSession([file("a.txt")], "/folder"));
    await act(async () => {
      await result.current.deleteFile();
    });

    act(() => result.current.undo());

    expect(result.current.sessionState.deletedFiles).toEqual([]);
    expect(result.current.sessionState.currentIndex).toBe(0);
    expect(result.current.sessionState.undoStack).toEqual([]);
  });

  it("is a no-op when there's nothing to undo", () => {
    const { result } = renderHook(() => useFileSession());
    act(() => result.current.startSession([file("a.txt")], "/folder"));

    act(() => result.current.undo());

    expect(result.current.sessionState.currentIndex).toBe(0);
  });
});

describe("reset", () => {
  it("clears the session back to empty", () => {
    const { result } = renderHook(() => useFileSession());
    act(() => result.current.startSession([file("a.txt")], "/folder"));
    act(() => result.current.keep());

    act(() => result.current.reset());

    expect(result.current.sessionState.files).toEqual([]);
    expect(result.current.sessionState.folderPath).toBe("");
    expect(result.current.sessionState.keptFiles).toEqual([]);
  });
});
