import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";
import type { AppSettings } from "./ipc-types";

export const DEFAULT_SETTINGS: AppSettings = {
  soundEffects: true,
  videoAutoplay: false,
  confirmDelete: true,
};

// Takes settingsPath as a dependency rather than computing it from
// app.getPath("userData") internally, so it's testable against a temp
// directory instead of the real user data folder.
export function createSettingsStore(settingsPath: string) {
  return {
    // Get app settings
    async getSettings(): Promise<AppSettings> {
      try {
        if (!existsSync(settingsPath)) {
          return DEFAULT_SETTINGS;
        }
        const settingsData = readFileSync(settingsPath, "utf8");
        return JSON.parse(settingsData);
      } catch (error) {
        console.error("Error reading settings:", error);
        return DEFAULT_SETTINGS;
      }
    },

    // Save app settings
    async saveSettings(settings: AppSettings): Promise<void> {
      try {
        // Ensure the settings directory exists
        const settingsDir = dirname(settingsPath);
        if (!existsSync(settingsDir)) {
          mkdirSync(settingsDir, { recursive: true });
        }

        writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      } catch (error) {
        console.error("Error saving settings:", error);
        throw error;
      }
    },
  };
}
