import { app, shell } from "electron";
import { autoUpdater } from "electron-updater";
import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";
import type { UpdateStatus } from "./ipc-types";

const RELEASES_URL = "https://github.com/killerwolf/QuickToss/releases";

interface UpdaterLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

function createUpdaterLogger(): UpdaterLogger {
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

// Window-free by design: takes an onStatus callback instead of a
// BrowserWindow/webContents reference, so only the coordinator ever touches
// the window. Not covered by a test file — it wraps electron-updater's real
// update-check flow, which (like moveToTrash) doesn't behave meaningfully
// outside a real Electron main process.
export function createUpdater(onStatus: (status: UpdateStatus) => void) {
  const logger = createUpdaterLogger();
  let availableUpdateVersion: string | null = null;

  // Installing an update in place needs a Developer ID signature: Squirrel.Mac
  // rejects the downloaded bundle's signature on arm64, and on x64
  // electron-updater can't even read a signature for the running app. Until
  // the app is signed and notarized, we only *check* for updates and point
  // the user at the releases page — downloading ~90MB just to fail at the
  // install step would be worse than not downloading at all.
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.logger = logger;
  logger.info(`Update check started (version ${app.getVersion()}, ${process.arch})`);

  autoUpdater.on("update-available", (info) => {
    logger.info(`Update available: ${info.version}`);
    availableUpdateVersion = info.version;
    onStatus({ state: "available", version: info.version });
  });

  autoUpdater.on("error", (error) => {
    logger.error("Update check failed", error);
    onStatus({ state: "error", message: error.message });
  });

  return {
    async checkForUpdates(): Promise<void> {
      try {
        await autoUpdater.checkForUpdates();
      } catch (error) {
        logger.error("Update check could not start", error);
      }
    },

    // Open the release page so the user can download the update manually.
    // The URL is built here rather than passed in from the renderer, so the
    // renderer can't ask the main process to open an arbitrary link.
    async openReleasePage(): Promise<void> {
      const url = availableUpdateVersion
        ? `${RELEASES_URL}/tag/v${availableUpdateVersion}`
        : `${RELEASES_URL}/latest`;
      logger.info(`Opening release page: ${url}`);
      await shell.openExternal(url);
    },
  };
}
