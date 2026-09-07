// Boots the real built app in Electron and asserts the renderer actually
// came up. Exists because lint, typecheck, the unit tests and `npm run pack`
// all pass on an app that opens to a blank window: none of them launch it.
//
// The specific failure this guards against is a preload that throws on load.
// Electron sandboxes the renderer by default, and a sandboxed preload can
// only require Electron's own builtins — so a stray `require("./something")`
// in the preload silently leaves window.electronAPI undefined and the
// renderer dead on its first property access.
//
// Run with `npm run test:smoke`, after a build.
const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const { CHANNELS } = require(path.join(__dirname, "..", "dist", "ipc-types.js"));

const LOAD_TIMEOUT_MS = 30000;
const failures = [];
const preloadErrors = [];

// Attach before the real main process creates its window, so a preload that
// fails during startup is still observed.
app.on("browser-window-created", (_event, win) => {
  win.webContents.on("preload-error", (_e, preloadPath, error) => {
    preloadErrors.push(`${preloadPath}: ${error.message}`);
  });
});

require(path.join(__dirname, "..", "dist", "main.js"));

function check(description, condition, detail) {
  if (condition) {
    console.log(`  ok    ${description}`);
    return;
  }
  console.log(`  FAIL  ${description}${detail ? ` — ${detail}` : ""}`);
  failures.push(description);
}

async function waitForRenderer(win) {
  const deadline = Date.now() + LOAD_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!win.webContents.isLoading()) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function run() {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) {
    console.log("  FAIL  the app created a window");
    return 1;
  }

  const loaded = await waitForRenderer(win);
  check("the renderer finished loading", loaded, `still loading after ${LOAD_TIMEOUT_MS}ms`);

  check("the preload script loaded", preloadErrors.length === 0, preloadErrors.join("; "));

  const apiType = await win.webContents.executeJavaScript("typeof window.electronAPI");
  check("contextBridge exposed window.electronAPI", apiType === "object", `got ${apiType}`);

  if (apiType === "object") {
    const exposed = await win.webContents.executeJavaScript("Object.keys(window.electronAPI)");
    const missing = Object.keys(CHANNELS).filter((name) => !exposed.includes(name));
    check("every IPC channel is exposed", missing.length === 0, `missing: ${missing.join(", ")}`);
  }

  const rendered = await win.webContents.executeJavaScript(
    "document.getElementById('root')?.textContent?.trim().length ?? 0"
  );
  check("React mounted and rendered", rendered > 0, "#root is empty");

  return failures.length === 0 ? 0 : 1;
}

app.whenReady().then(async () => {
  console.log("Smoke test: booting the built app");
  let code = 1;
  try {
    code = await run();
  } catch (error) {
    console.log(`  FAIL  the smoke test threw — ${error.message}`);
  }
  console.log(code === 0 ? "Smoke test passed." : `Smoke test failed (${failures.length}).`);
  app.exit(code);
});
