# Hand-rolled typed IPC contract instead of a library

`main.ts` and `preload.ts` share a 9-channel Electron IPC surface (8 request/response, 1 push). Instead of adopting a type-safe-IPC library (e.g. `electron-trpc`, `tipc`), we derive both sides from the existing `ElectronAPI` interface in `ipc-types.ts` with a small hand-rolled helper: an explicit `CHANNELS` const for wire names, and a `registerHandlers(handlers: RequestAPI)` call on the main-process side that mirrors the `satisfies ElectronAPI` pattern `preload.ts` already used.

A library would buy little at this surface area — 9 channels, all in-process, no cross-version compatibility concerns — while adding a dependency to keep current across Electron upgrades. Revisit this if the channel count grows substantially or the app starts exposing IPC across process/version boundaries where a library's guarantees would start to matter.
