// -webkit-app-region is an Electron/Chromium-only CSS property used to mark
// regions of the window as draggable. React's CSSProperties doesn't know it, so
// declare it rather than casting at each use site.
declare module "react" {
  interface CSSProperties {
    WebkitAppRegion?: "drag" | "no-drag";
  }
}

// Makes this file a module, so the block above augments React's types instead
// of declaring a new ambient "react" module that would replace them.
export {};
