import { execFile } from "child_process";
import { shell } from "electron";
import { existsSync, readFileSync } from "fs";
import { mkdtemp, readdir, readFile, rm, stat } from "fs/promises";
import { tmpdir } from "os";
import { basename, join } from "path";
import { promisify } from "util";
import { getFileType, isSupportedExtension } from "./file-types";
import type { FileItem, FileStats } from "./ipc-types";

const execFileAsync = promisify(execFile);

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

// Ask macOS Quick Look for a rendered thumbnail. A null result is intentional:
// unsupported platforms and files use the renderer's format-specific fallback.
export async function getQuickLookThumbnail(filePath: string): Promise<ArrayBuffer | null> {
  if (process.platform !== "darwin") return null;

  const outputDirectory = await mkdtemp(join(tmpdir(), "quicktoss-quicklook-"));
  try {
    await execFileAsync("/usr/bin/qlmanage", ["-t", "-s", "1600", "-o", outputDirectory, filePath]);
    const outputFiles = await readdir(outputDirectory);
    const thumbnailName = outputFiles.find((name) => name.toLowerCase().endsWith(".png"));
    if (!thumbnailName) {
      console.warn(`Quick Look did not generate a thumbnail for ${basename(filePath)}`);
      return null;
    }

    const buffer = await readFile(join(outputDirectory, thumbnailName));
    return new Uint8Array(buffer).slice().buffer;
  } catch (error) {
    console.warn(`Quick Look preview unavailable for ${basename(filePath)}:`, error);
    return null;
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
}
