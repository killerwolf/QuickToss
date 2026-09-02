import { contextBridge, ipcRenderer } from "electron";
import { type AppSettings, CHANNELS, type ElectronAPI, type UpdateStatus } from "./ipc-types";

export type { AppSettings, ElectronAPI, FileItem, FileStats, UpdateStatus } from "./ipc-types";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  selectFolder: () => ipcRenderer.invoke(CHANNELS.selectFolder),
  scanFolder: (folderPath: string) => ipcRenderer.invoke(CHANNELS.scanFolder, folderPath),
  moveToTrash: (filePath: string) => ipcRenderer.invoke(CHANNELS.moveToTrash, filePath),
  getFileStats: (filePath: string) => ipcRenderer.invoke(CHANNELS.getFileStats, filePath),
  fileExists: (filePath: string) => ipcRenderer.invoke(CHANNELS.fileExists, filePath),
  readFileAsBuffer: (filePath: string) => ipcRenderer.invoke(CHANNELS.readFileAsBuffer, filePath),
  getSettings: () => ipcRenderer.invoke(CHANNELS.getSettings),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke(CHANNELS.saveSettings, settings),
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
    const listener = (_: unknown, status: UpdateStatus) => callback(status);
    ipcRenderer.on(CHANNELS.onUpdateStatus, listener);
    return () => ipcRenderer.removeListener(CHANNELS.onUpdateStatus, listener);
  },
  openReleasePage: () => ipcRenderer.invoke(CHANNELS.openReleasePage),
} satisfies ElectronAPI);

// Type the global object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
