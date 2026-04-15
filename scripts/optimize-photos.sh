#!/usr/bin/env bash
# Resize original photos in photos/Yannick/ into two web-ready sizes:
#   photos/Yannick-web/   (max 1920px long edge, ~82% JPEG)  — for lightbox
#   photos/Yannick-thumb/ (max 600px long edge,  ~75% JPEG)  — for grid
# Also writes photos/manifest.json listing every photo.
# Videos (mov/mp4) are skipped. Uses macOS-native `sips`.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ROOT/photos/Yannick"
WEB_DIR="$ROOT/photos/Yannick-web"
THUMB_DIR="$ROOT/photos/Yannick-thumb"
MANIFEST="$ROOT/photos/manifest.json"

WEB_MAX=1920
THUMB_MAX=600
WEB_Q=82
THUMB_Q=75
JOBS=8

mkdir -p "$WEB_DIR" "$THUMB_DIR"

process_one() {
  local src="$1"
  local base name ext_lc stem out_web out_thumb
  base="$(basename "$src")"
  name="${base%.*}"
  ext_lc="$(printf '%s' "${base##*.}" | tr '[:upper:]' '[:lower:]')"
  case "$ext_lc" in
    jpg|jpeg|png) ;;
    *) return 0 ;;  # skip videos & anything else
  esac
  out_web="$WEB_DIR/$name.jpg"
  out_thumb="$THUMB_DIR/$name.jpg"

  if [ ! -f "$out_web" ]; then
    sips -s format jpeg -s formatOptions "$WEB_Q" \
         -Z "$WEB_MAX" "$src" --out "$out_web" >/dev/null
  fi
  if [ ! -f "$out_thumb" ]; then
    sips -s format jpeg -s formatOptions "$THUMB_Q" \
         -Z "$THUMB_MAX" "$src" --out "$out_thumb" >/dev/null
  fi
}
export -f process_one
export WEB_DIR THUMB_DIR WEB_MAX THUMB_MAX WEB_Q THUMB_Q

echo "Resizing images from $SRC_DIR ..."
# Use NUL separators so filenames with spaces/special chars are safe.
find "$SRC_DIR" -maxdepth 1 -type f \
  \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) -print0 \
  | xargs -0 -n 1 -P "$JOBS" -I{} bash -c 'process_one "$@"' _ {}

echo "Writing manifest -> $MANIFEST"
# Build JSON array: [{"thumb":"Yannick-thumb/x.jpg","src":"Yannick-web/x.jpg"}, ...]
{
  printf '{\n  "photos": [\n'
  first=1
  while IFS= read -r f; do
    name="$(basename "$f" .jpg)"
    if [ $first -eq 1 ]; then first=0; else printf ',\n'; fi
    printf '    {"thumb": "Yannick-thumb/%s.jpg", "src": "Yannick-web/%s.jpg"}' "$name" "$name"
  done < <(find "$WEB_DIR" -maxdepth 1 -type f -name '*.jpg' | sort)
  printf '\n  ]\n}\n'
} > "$MANIFEST"

echo "Done."
echo "  Web dir:   $(find "$WEB_DIR"   -type f | wc -l | tr -d ' ') files, $(du -sh "$WEB_DIR"   | cut -f1)"
echo "  Thumb dir: $(find "$THUMB_DIR" -type f | wc -l | tr -d ' ') files, $(du -sh "$THUMB_DIR" | cut -f1)"
