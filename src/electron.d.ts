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

export interface ElectronAPI {
  selectFolder: () => Promise<string | null>;
  scanFolder: (folderPath: string) => Promise<FileItem[]>;
  moveToTrash: (filePath: string) => Promise<boolean>;
  getFileStats: (filePath: string) => Promise<FileStats | null>;
  fileExists: (filePath: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
