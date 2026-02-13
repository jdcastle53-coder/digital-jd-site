#!/usr/bin/env bash
# package-site.sh — create a zip of the static site ready for upload to hosting (Bluehost etc.)
# Usage: ./package-site.sh [output.zip]

set -euo pipefail

OUT=${1:-site-package.zip}

# ensure working dir is repo root
cd "$(dirname "$0")"

# collect all root-level HTML pages and required assets
INCLUDE_FILES=( *.html auth.js )

# include optional favicon if present
if [ -f favicon.ico ]; then
  INCLUDE_FILES+=(favicon.ico)
fi

# include images folder if present
if [ -d images ]; then
  INCLUDE_FILES+=(images)
fi

# remove existing archive
rm -f "$OUT"

# create zip from collected files
zip -r "$OUT" "${INCLUDE_FILES[@]}" >/dev/null
echo "Created $OUT"
