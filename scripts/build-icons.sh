#!/usr/bin/env bash
#
# Regenerates assets/icon.icns and the PNG sizes from assets/icon.svg.
#
# The Node version of this reached for `npx electron-icon-builder`, which
# drags in a deprecated phantomjs-prebuilt whose postinstall downloads a 17 MB
# binary and had already failed CI on a transient 504. macOS ships everything
# this actually needs: qlmanage rasterises the SVG, sips resizes, iconutil
# assembles the .icns.
#
#   scripts/build-icons.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSETS="$ROOT/assets"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "Rasterising icon.svg at 1024px"
qlmanage -t -s 1024 -o "$WORK" "$ASSETS/icon.svg" >/dev/null 2>&1
MASTER="$(find "$WORK" -maxdepth 1 -name '*.png' | head -1)"
[ -n "$MASTER" ] || { echo "Could not rasterise assets/icon.svg" >&2; exit 1; }

# .icns wants a specific set of sizes, each also at @2x.
ICONSET="$WORK/QuickToss.iconset"
mkdir -p "$ICONSET"
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$MASTER" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null
  sips -z $((size * 2)) $((size * 2)) "$MASTER" \
    --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null
done

iconutil --convert icns "$ICONSET" --output "$ASSETS/icon.icns"
echo "  assets/icon.icns"

# The standalone PNGs the README and landing page use.
sips -z 512 512 "$MASTER" --out "$ASSETS/icon.png" >/dev/null
echo "  assets/icon.png"
for size in 16 32 64 128 256; do
  sips -z "$size" "$size" "$MASTER" --out "$ASSETS/icon-$size.png" >/dev/null
  echo "  assets/icon-$size.png"
done
