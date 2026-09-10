#!/usr/bin/env bash
#
# Builds QuickToss.app, and optionally the DMG that ships it.
#
# This replaces electron-builder. What it has to do is now small enough to
# read in one sitting: compile a binary, put it in a folder with an Info.plist
# and an icon, and wrap that in a disk image.
#
#   scripts/bundle.sh          # build dist/QuickToss.app
#   scripts/bundle.sh --dmg    # ...and dist/QuickToss-<version>-<arch>.dmg
#
# Both architectures are built and merged into one universal binary when both
# targets are installed (`rustup target add x86_64-apple-darwin`); otherwise
# it builds for this Mac alone and says so.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CRATE="$ROOT/app"
DIST="$ROOT/dist"
APP="$DIST/QuickToss.app"

VERSION="$(awk -F'"' '/^version = /{print $2; exit}' "$CRATE/Cargo.toml")"
BUNDLE_ID="com.quicktoss.app"

# macOS 12 is the floor the app has always claimed, and comfortably above what
# GPUI's Metal renderer and QuickLookThumbnailing each need.
MIN_MACOS="12.0"

log() { printf '\033[1m▸\033[0m %s\n' "$*"; }

# ---- compile ---------------------------------------------------------------

INSTALLED="$(rustup target list --installed)"
TARGETS=()
for target in aarch64-apple-darwin x86_64-apple-darwin; do
  if grep -qx "$target" <<< "$INSTALLED"; then
    TARGETS+=("$target")
  fi
done

BINARIES=()
if [ ${#TARGETS[@]} -lt 2 ]; then
  # Only this Mac's architecture is available. Build without --target so the
  # artifacts land in the default directory: passing an explicit target that
  # equals the host triple gives cargo a second, complete copy of the
  # dependency tree for no benefit, and this one is several gigabytes.
  echo "  note: x86_64-apple-darwin is not installed, so this build is not universal." >&2
  echo "        rustup target add x86_64-apple-darwin  # to ship both" >&2

  log "Building for this Mac"
  (cd "$CRATE" && cargo build --release)
  BINARIES+=("$CRATE/target/release/quicktoss")
  FLAVOUR="$(uname -m)"
else
  for target in "${TARGETS[@]}"; do
    log "Building $target"
    (cd "$CRATE" && cargo build --release --target "$target")
    BINARIES+=("$CRATE/target/$target/release/quicktoss")
  done
  FLAVOUR="universal"
fi

# ---- assemble --------------------------------------------------------------

log "Assembling QuickToss.app ($VERSION)"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

lipo -create -output "$APP/Contents/MacOS/quicktoss" "${BINARIES[@]}"
cp "$ROOT/assets/icon.icns" "$APP/Contents/Resources/icon.icns"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>QuickToss</string>
  <key>CFBundleDisplayName</key><string>QuickToss</string>
  <key>CFBundleIdentifier</key><string>$BUNDLE_ID</string>
  <key>CFBundleExecutable</key><string>quicktoss</string>
  <key>CFBundleIconFile</key><string>icon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>$VERSION</string>
  <key>CFBundleVersion</key><string>$VERSION</string>
  <key>LSMinimumSystemVersion</key><string>$MIN_MACOS</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.productivity</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSHumanReadableCopyright</key><string>MIT licensed</string>
</dict>
</plist>
PLIST

# An ad-hoc signature. Not a Developer ID — that still needs the certificate
# tracked in issue #7 — but it gives the bundle a valid, stable signature
# instead of none at all.
log "Signing (ad-hoc)"
codesign --force --sign - --timestamp=none "$APP" >/dev/null 2>&1 ||
  echo "  note: ad-hoc signing failed; the bundle is unsigned." >&2

echo "  $APP  ($(du -sh "$APP" | cut -f1))"

# ---- package ---------------------------------------------------------------

if [ "${1:-}" = "--dmg" ]; then
  # Named for what it actually contains, so a one-architecture local build
  # can't be mistaken for the universal one CI publishes.
  DMG="$DIST/QuickToss-$VERSION-$FLAVOUR.dmg"
  log "Building $(basename "$DMG")"
  rm -f "$DMG"

  STAGE="$(mktemp -d)"
  cp -R "$APP" "$STAGE/"
  ln -s /Applications "$STAGE/Applications"

  hdiutil create -volname "QuickToss" -srcfolder "$STAGE" -ov -format ULFO "$DMG" >/dev/null
  rm -rf "$STAGE"

  echo "  $DMG  ($(du -sh "$DMG" | cut -f1))"
fi
