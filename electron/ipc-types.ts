// Single source of truth for the main <-> renderer contract.
//
// electron/main.ts implements the IPC handlers, electron/preload.ts exposes
// them on window.electronAPI, and the renderer picks them up through
// src/electron.d.ts. Keeping the shapes here means a change to the API can't
// silently disagree across the three.
//
// This file lives under electron/ because tsconfig.main.json sets
// rootDir to "electron" and cannot compile sources outside it.

export interface FileItem {
  name: string;
  path: string;
  size: number;
  modified: Date;
  extension: string;
  type: "image" | "document" | "video" | "other";
}

export interface FileStats {
  size: number;
  modified: Date;
  created: Date;
}

export interface AppSettings {
  soundEffects: boolean;
  videoAutoplay: boolean;
  confirmDelete: boolean;
}

export type UpdateStatus =
  | { state: "available"; version: string }
  | { state: "error"; message: string };

export interface ElectronAPI {
  selectFolder: () => Promise<string | null>;
  scanFolder: (folderPath: string) => Promise<FileItem[]>;
  moveToTrash: (filePath: string) => Promise<boolean>;
  getFileStats: (filePath: string) => Promise<FileStats | null>;
  fileExists: (filePath: string) => Promise<boolean>;
  readFileAsBuffer: (filePath: string) => Promise<ArrayBuffer>;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
  openReleasePage: () => Promise<void>;
}
