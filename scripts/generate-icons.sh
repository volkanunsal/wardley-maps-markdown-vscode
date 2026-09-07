#!/usr/bin/env bash
set -euo pipefail

if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo "rsvg-convert not found. Install it (e.g. 'brew install librsvg') and re-run." >&2
  exit 1
fi

rsvg-convert -w 128 -h 128 media/logo-source.svg -o media/icon.png
rsvg-convert -w 512 -h 512 media/logo-source.svg -o media/logo.png
