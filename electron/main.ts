import { app, BrowserWindow, dialog } from "electron";
import { join } from "path";
import {
  fileExists,
  getFileStats,
  moveToTrash,
  readFileAsBuffer,
  scanFolder,
} from "./file-operations";
import { registerHandlers } from "./ipc-register";
import { CHANNELS, type RequestAPI } from "./ipc-types";
import { createSettingsStore } from "./settings-store";
import { createUpdater } from "./updater";

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require("electron-squirrel-startup")) {
  app.quit();
}

class QuickTossApp {
  private mainWindow: BrowserWindow | null = null;
  private isDev = process.env.NODE_ENV === "development";
  private settingsStore = createSettingsStore(join(app.getPath("userData"), "settings.json"));
  private updater = createUpdater((status) => {
    this.mainWindow?.webContents.send(CHANNELS.onUpdateStatus, status);
  });

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
      this.updater.checkForUpdates();
    });

    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });
  }

  private setupIPC() {
    const handlers: RequestAPI = {
      // Select folder dialog. The only handler that needs mainWindow, so it
      // stays here instead of in file-operations.ts, which is window-free.
      selectFolder: async () => {
        if (!this.mainWindow) return null;

        const result = await dialog.showOpenDialog(this.mainWindow, {
          properties: ["openDirectory"],
          title: "Select folder to organize",
        });

        return result.canceled ? null : result.filePaths[0];
      },

      scanFolder,
      moveToTrash,
      getFileStats,
      fileExists,
      readFileAsBuffer,
      getSettings: this.settingsStore.getSettings,
      saveSettings: this.settingsStore.saveSettings,
      openReleasePage: this.updater.openReleasePage,
    };

    registerHandlers(handlers);
  }
}

// Initialize the app
new QuickTossApp();
