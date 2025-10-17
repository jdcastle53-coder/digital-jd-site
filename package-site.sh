#!/usr/bin/env bash
# package-site.sh — create a zip of the static site ready for upload to hosting (Bluehost etc.)
# Usage: ./package-site.sh [output.zip]
OUT=${1:-site-package.zip}
ROOT_FILES=(index.html cancel.html success.html README.md)
# include favicon if present
if [ -f favicon.ico ]; then
  ROOT_FILES+=(favicon.ico)
fi
# ensure working dir is repo root
cd "$(dirname "$0")"
# remove existing archive
rm -f "$OUT"
# create zip from listed files
zip -r "$OUT" "${ROOT_FILES[@]}" >/dev/null
echo "Created $OUT with: ${ROOT_FILES[*]}"
