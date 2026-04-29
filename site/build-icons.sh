#!/usr/bin/env bash
# Regenerate the PNG/ICO icon assets from the SVG sources.
# Run this whenever favicon.svg, icon.svg, or og.svg changes.

set -euo pipefail
cd "$(dirname "$0")"

if ! command -v rsvg-convert >/dev/null; then
  echo "error: rsvg-convert not found. Install librsvg (macOS: brew install librsvg)." >&2
  exit 1
fi

if ! command -v magick >/dev/null && ! command -v convert >/dev/null; then
  echo "error: ImageMagick not found. Install it (macOS: brew install imagemagick)." >&2
  exit 1
fi

# Pick magick (v7) over convert (v6) when both exist.
if command -v magick >/dev/null; then
  MAGICK="magick"
else
  MAGICK="convert"
fi

echo "→ og.png (1200x630, social card)"
rsvg-convert -w 1200 -h 630 og.svg -o og.png

echo "→ apple-touch-icon.png (180x180)"
rsvg-convert -w 180 -h 180 icon.svg -o apple-touch-icon.png

echo "→ icon-192.png and icon-512.png (PWA manifest)"
rsvg-convert -w 192 -h 192 icon.svg -o icon-192.png
rsvg-convert -w 512 -h 512 icon.svg -o icon-512.png

echo "→ favicon.ico (64/48/32/16 multi-resolution)"
"$MAGICK" favicon.svg -define icon:auto-resize=64,48,32,16 favicon.ico

echo
echo "Done. Sizes:"
ls -lh og.png apple-touch-icon.png icon-192.png icon-512.png favicon.ico | awk '{print "  ", $9, "—", $5}'
