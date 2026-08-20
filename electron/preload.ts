import { contextBridge, ipcRenderer } from "electron";

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
  | { state: "downloading"; percent: number }
  | { state: "downloaded"; version: string }
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
  quitAndInstall: () => Promise<void>;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  scanFolder: (folderPath: string) => ipcRenderer.invoke("scan-folder", folderPath),
  moveToTrash: (filePath: string) => ipcRenderer.invoke("move-to-trash", filePath),
  getFileStats: (filePath: string) => ipcRenderer.invoke("get-file-stats", filePath),
  fileExists: (filePath: string) => ipcRenderer.invoke("file-exists", filePath),
  readFileAsBuffer: (filePath: string) => ipcRenderer.invoke("read-file-as-buffer", filePath),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke("save-settings", settings),
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
    const listener = (_: unknown, status: UpdateStatus) => callback(status);
    ipcRenderer.on("update-status", listener);
    return () => ipcRenderer.removeListener("update-status", listener);
  },
  quitAndInstall: () => ipcRenderer.invoke("quit-and-install"),
} as ElectronAPI);

// Type the global object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
