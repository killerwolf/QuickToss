// The API shapes live in electron/ipc-types.ts, next to the preload script that
// implements them. This file only re-exports them for renderer code and
// declares the global that preload installs.
import type { ElectronAPI } from "../electron/ipc-types";

export type {
  AppSettings,
  ElectronAPI,
  FileItem,
  FileStats,
  UpdateStatus,
} from "../electron/ipc-types";

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
