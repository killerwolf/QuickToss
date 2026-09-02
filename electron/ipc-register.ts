import { ipcMain } from "electron";
import { CHANNELS, type RequestAPI } from "./ipc-types";

// Wires every RequestAPI handler to its CHANNELS wire name. Typing `handlers`
// as RequestAPI at the setupIPC() call site means a channel missing from that
// object literal is a compile error, not a silent gap discovered only when
// the renderer invokes it. The cast below is confined to this generic loop:
// it doesn't affect that guarantee, which comes entirely from the call site's
// annotation.
//
// Kept out of main.ts, which instantiates the app (and its Squirrel-startup
// side effect) at import time and so can't be loaded from a test — see
// electron/file-types.ts for the same convention.
export function registerHandlers(handlers: RequestAPI) {
  for (const key of Object.keys(handlers) as (keyof RequestAPI)[]) {
    const handler = handlers[key] as (...args: unknown[]) => unknown;
    ipcMain.handle(CHANNELS[key], (_event, ...args) => handler(...args));
  }
}
