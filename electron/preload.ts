import { contextBridge, ipcRenderer } from "electron";
import type { AppSettings, ElectronAPI, UpdateStatus } from "./ipc-types";

export type { AppSettings, ElectronAPI, FileItem, FileStats, UpdateStatus } from "./ipc-types";

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
  openReleasePage: () => ipcRenderer.invoke("open-release-page"),
} satisfies ElectronAPI);

// Type the global object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
