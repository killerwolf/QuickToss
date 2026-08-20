import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { autoUpdater } from "electron-updater";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { getFileType, isSupportedExtension } from "./file-types";
import type { AppSettings, FileItem, UpdateStatus } from "./ipc-types";

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require("electron-squirrel-startup")) {
  app.quit();
}

const RELEASES_URL = "https://github.com/killerwolf/QuickToss/releases";

interface UpdaterLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

class QuickTossApp {
  private mainWindow: BrowserWindow | null = null;
  private isDev = process.env.NODE_ENV === "development";
  private settingsPath: string;
  private updaterLogger: UpdaterLogger;
  private availableUpdateVersion: string | null = null;

  constructor() {
    this.settingsPath = join(app.getPath("userData"), "settings.json");
    this.updaterLogger = this.createUpdaterLogger();
    this.setupApp();
    this.setupIPC();
    this.setupAutoUpdater();
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

  private setupAutoUpdater() {
    // Installing an update in place needs a Developer ID signature: Squirrel.Mac
    // rejects the downloaded bundle's signature on arm64, and on x64
    // electron-updater can't even read a signature for the running app. Until
    // the app is signed and notarized, we only *check* for updates and point
    // the user at the releases page — downloading ~90MB just to fail at the
    // install step would be worse than not downloading at all.
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    const logger = this.updaterLogger;
    autoUpdater.logger = logger;
    logger.info(`Update check started (version ${app.getVersion()}, ${process.arch})`);

    const sendStatus = (status: UpdateStatus) => {
      this.mainWindow?.webContents.send("update-status", status);
    };

    autoUpdater.on("update-available", (info) => {
      logger.info(`Update available: ${info.version}`);
      this.availableUpdateVersion = info.version;
      sendStatus({ state: "available", version: info.version });
    });

    autoUpdater.on("error", (error) => {
      logger.error("Update check failed", error);
      sendStatus({ state: "error", message: error.message });
    });
  }

  private createUpdaterLogger() {
    // app.getPath("logs") points at ~/Library/Logs/QuickToss on macOS, but the
    // directory isn't guaranteed to exist yet — without this the very first
    // append throws ENOENT and every log line is silently lost.
    const logDir = app.getPath("logs");
    mkdirSync(logDir, { recursive: true });
    const logPath = join(logDir, "auto-updater.log");

    const format = (value: unknown) =>
      value instanceof Error ? (value.stack ?? `${value.name}: ${value.message}`) : String(value);

    const write = (level: string, args: unknown[]) => {
      const line = `[${new Date().toISOString()}] [${level}] ${args.map(format).join(" ")}\n`;
      try {
        appendFileSync(logPath, line);
      } catch (error) {
        console.error("Failed to write updater log:", error);
      }
    };

    return {
      info: (...args: unknown[]) => write("info", args),
      warn: (...args: unknown[]) => write("warn", args),
      error: (...args: unknown[]) => write("error", args),
      debug: (...args: unknown[]) => write("debug", args),
    };
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

    // Set the application name for the menu bar
    app.setName("QuickToss");

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

    // Check only once the renderer is loaded and listening — the check can
    // resolve in about a second, and a result sent before the renderer
    // subscribes to "update-status" would be dropped and never shown.
    this.mainWindow.webContents.once("did-finish-load", () => {
      if (this.isDev) return;
      autoUpdater.checkForUpdates().catch((error) => {
        this.updaterLogger.error("Update check could not start", error);
      });
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

    // Read file as buffer for PDF preview
    ipcMain.handle("read-file-as-buffer", async (_, filePath: string) => {
      try {
        const buffer = readFileSync(filePath);
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      } catch (error) {
        console.error("Error reading file as buffer:", error);
        throw error;
      }
    });

    // Get app settings
    ipcMain.handle("get-settings", async () => {
      try {
        if (existsSync(this.settingsPath)) {
          const settingsData = readFileSync(this.settingsPath, "utf8");
          return JSON.parse(settingsData);
        } else {
          // Return default settings
          const defaultSettings: AppSettings = {
            soundEffects: true,
            videoAutoplay: false,
            confirmDelete: true,
          };
          return defaultSettings;
        }
      } catch (error) {
        console.error("Error reading settings:", error);
        // Return default settings on error
        return {
          soundEffects: true,
          videoAutoplay: false,
          confirmDelete: true,
        };
      }
    });

    // Save app settings
    ipcMain.handle("save-settings", async (_, settings: AppSettings) => {
      try {
        // Ensure userData directory exists
        const userDataDir = app.getPath("userData");
        if (!existsSync(userDataDir)) {
          mkdirSync(userDataDir, { recursive: true });
        }

        writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
        return true;
      } catch (error) {
        console.error("Error saving settings:", error);
        throw error;
      }
    });

    // Open the release page so the user can download the update manually.
    // The URL is built here rather than passed in from the renderer, so the
    // renderer can't ask the main process to open an arbitrary link.
    ipcMain.handle("open-release-page", async () => {
      const url = this.availableUpdateVersion
        ? `${RELEASES_URL}/tag/v${this.availableUpdateVersion}`
        : `${RELEASES_URL}/latest`;
      this.updaterLogger.info(`Opening release page: ${url}`);
      await shell.openExternal(url);
    });
  }

  private async scanFolder(folderPath: string): Promise<FileItem[]> {
    const files: FileItem[] = [];

    try {
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
    } catch (error) {
      console.error("Error scanning folder:", error);
      throw error;
    }
  }
}

// Initialize the app
new QuickTossApp();
