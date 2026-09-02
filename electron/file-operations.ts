import { shell } from "electron";
import { existsSync, readFileSync } from "fs";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { getFileType, isSupportedExtension } from "./file-types";
import type { FileItem, FileStats } from "./ipc-types";

// Error-handling policy: operations with no safe fallback value (scanFolder,
// moveToTrash, readFileAsBuffer) log and rethrow, via logAndRethrow below, so
// a failure never gets silently swallowed. getFileStats has a safe fallback
// (null — the file just has no displayable stats) and returns it instead.
// fileExists can't meaningfully fail.
async function logAndRethrow<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`Error ${label}:`, error);
    throw error;
  }
}

// Scan a folder for files
export async function scanFolder(folderPath: string): Promise<FileItem[]> {
  return logAndRethrow("scanning folder", async () => {
    const files: FileItem[] = [];
    const entries = await readdir(folderPath);

    for (const entry of entries) {
      const fullPath = join(folderPath, entry);
      const stats = await stat(fullPath);

      if (stats.isFile()) {
        const extension = entry.toLowerCase().substring(entry.lastIndexOf("."));

        if (isSupportedExtension(extension)) {
          files.push({
            name: entry,
            path: fullPath,
            size: stats.size,
            modified: stats.mtime,
            extension,
            type: getFileType(extension),
          });
        }
      }
    }

    // Sort by modification date (newest first)
    files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    return files;
  });
}

// Move a file to trash.
//
// Not covered by file-operations.test.ts: shell.trashItem doesn't behave
// meaningfully outside a real Electron main process, so a temp-dir test can
// only prove a mock got called, not that a file actually moved to trash.
export async function moveToTrash(filePath: string): Promise<boolean> {
  return logAndRethrow("moving to trash", async () => {
    await shell.trashItem(filePath);
    return true;
  });
}

// Get file stats
export async function getFileStats(filePath: string): Promise<FileStats | null> {
  try {
    const stats = await stat(filePath);
    return {
      size: stats.size,
      modified: stats.mtime,
      created: stats.birthtime,
    };
  } catch (error) {
    console.error("Error getting file stats:", error);
    return null;
  }
}

// Check if file exists
export async function fileExists(filePath: string): Promise<boolean> {
  return existsSync(filePath);
}

// Read file as buffer for PDF preview
export async function readFileAsBuffer(filePath: string): Promise<ArrayBuffer> {
  return logAndRethrow("reading file as buffer", async () => {
    const buffer = readFileSync(filePath);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  });
}
