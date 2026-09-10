#!/usr/bin/env bash
#
# Prints one version's section from CHANGELOG.md, for use as GitHub release
# notes. Replaces the Node script of the same name — the release pipeline no
# longer has a Node runtime to lean on, and this never needed one.
#
#   scripts/changelog-section.sh v1.5.0

set -euo pipefail

VERSION="${1:-}"
VERSION="${VERSION#v}"

if [ -z "$VERSION" ]; then
  echo "usage: changelog-section.sh <version>" >&2
  exit 1
fi

CHANGELOG="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/CHANGELOG.md"

# The section runs from its own "## [x.y.z]" heading to the next "## " heading.
BODY="$(awk -v version="## [$VERSION]" '
  index($0, version) == 1 { inside = 1; next }
  inside && /^## / { exit }
  inside { print }
' "$CHANGELOG")"

# Trim blank lines from both ends.
BODY="$(printf '%s' "$BODY" | sed -e '/./,$!d' | sed -e :a -e '/^\n*$/{$d;N;};/\n$/ba')"

if [ -z "$BODY" ]; then
  echo "No section for $VERSION in CHANGELOG.md" >&2
  exit 1
fi

printf '%s\n' "$BODY"
