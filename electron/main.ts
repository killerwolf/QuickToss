import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { existsSync } from "fs";
import { readdir, stat } from "fs/promises";
import { join } from "path";

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require("electron-squirrel-startup")) {
  app.quit();
}

class QuickTossApp {
  private mainWindow: BrowserWindow | null = null;
  private isDev = process.env.NODE_ENV === "development";

  constructor() {
    this.setupApp();
    this.setupIPC();
  }

  private setupApp() {
    app.whenReady().then(() => {
      this.createMainWindow();

      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        app.quit();
      }
    });
  }

  private createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, "preload.js"),
        webSecurity: true,
      },
      show: false,
      titleBarStyle: "default",
      title: "QuickToss",
    });

    // Load the React app
    if (this.isDev) {
      this.mainWindow.loadURL("http://localhost:3000");
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(join(__dirname, "../dist-react/index.html"));
    }

    this.mainWindow.once("ready-to-show", () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });
  }

  private setupIPC() {
    // Select folder dialog
    ipcMain.handle("select-folder", async () => {
      if (!this.mainWindow) return null;

      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ["openDirectory"],
        title: "Select folder to organize",
      });

      return result.canceled ? null : result.filePaths[0];
    });

    // Scan folder for files
    ipcMain.handle("scan-folder", async (_, folderPath: string) => {
      try {
        const files = await this.scanFolder(folderPath);
        return files;
      } catch (error) {
        console.error("Error scanning folder:", error);
        throw error;
      }
    });

    // Move file to trash
    ipcMain.handle("move-to-trash", async (_, filePath: string) => {
      try {
        await shell.trashItem(filePath);
        return true;
      } catch (error) {
        console.error("Error moving to trash:", error);
        throw error;
      }
    });

    // Get file stats
    ipcMain.handle("get-file-stats", async (_, filePath: string) => {
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
    });

    // Check if file exists
    ipcMain.handle("file-exists", async (_, filePath: string) => {
      return existsSync(filePath);
    });
  }

  private async scanFolder(folderPath: string): Promise<FileItem[]> {
    const supportedExtensions = [
      // Images
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".heic",
      ".bmp",
      ".tiff",
      // Documents
      ".pdf",
      ".txt",
      ".rtf",
      ".md",
      // Future support
      ".mp4",
      ".mov",
      ".avi",
      ".doc",
      ".docx",
    ];

    const files: FileItem[] = [];

    try {
      const entries = await readdir(folderPath);

      for (const entry of entries) {
        const fullPath = join(folderPath, entry);
        const stats = await stat(fullPath);

        if (stats.isFile()) {
          const extension = entry.toLowerCase().substring(entry.lastIndexOf("."));

          if (supportedExtensions.includes(extension)) {
            files.push({
              name: entry,
              path: fullPath,
              size: stats.size,
              modified: stats.mtime,
              extension,
              type: this.getFileType(extension),
            });
          }
        }
      }

      // Sort by modification date (newest first)
      files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

      return files;
    } catch (error) {
      console.error("Error scanning folder:", error);
      throw error;
    }
  }

  private getFileType(extension: string): "image" | "document" | "video" | "other" {
    const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".bmp", ".tiff"];
    const docExts = [".pdf", ".txt", ".rtf", ".md", ".doc", ".docx"];
    const videoExts = [".mp4", ".mov", ".avi"];

    if (imageExts.includes(extension)) return "image";
    if (docExts.includes(extension)) return "document";
    if (videoExts.includes(extension)) return "video";
    return "other";
  }
}

interface FileItem {
  name: string;
  path: string;
  size: number;
  modified: Date;
  extension: string;
  type: "image" | "document" | "video" | "other";
}

// Initialize the app
new QuickTossApp();
