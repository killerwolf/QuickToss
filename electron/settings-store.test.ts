import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AppSettings } from "./ipc-types";
import { createSettingsStore, DEFAULT_SETTINGS } from "./settings-store";

let dir: string;
let settingsPath: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "quicktoss-settings-store-"));
  settingsPath = join(dir, "settings.json");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("getSettings", () => {
  it("returns the defaults when no settings file exists", async () => {
    const store = createSettingsStore(settingsPath);
    expect(await store.getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("returns the defaults when the settings file is corrupted", async () => {
    await writeFile(settingsPath, "{not valid json");
    const store = createSettingsStore(settingsPath);
    expect(await store.getSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe("saveSettings", () => {
  it("round-trips through getSettings", async () => {
    const store = createSettingsStore(settingsPath);
    const settings: AppSettings = {
      soundEffects: false,
      videoAutoplay: true,
      confirmDelete: false,
    };

    await store.saveSettings(settings);

    expect(await store.getSettings()).toEqual(settings);
  });

  it("creates the parent directory if it doesn't exist yet", async () => {
    const nestedPath = join(dir, "nested", "settings.json");
    const store = createSettingsStore(nestedPath);

    await store.saveSettings(DEFAULT_SETTINGS);

    expect(await store.getSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
