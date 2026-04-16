#!/usr/bin/env bash
# Generate the A5 gift card PDF (printables/gift-card.pdf) from its HTML
# template + a freshly generated QR code pointing at https://brigger.dk.
#
# Requires: python3 with `segno` module, and Google Chrome (macOS).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="$ROOT/gift-card.template.html"
HTML_OUT="$ROOT/gift-card.html"
PDF_OUT="$ROOT/gift-card.pdf"
URL="https://brigger.dk"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [ ! -x "$CHROME" ]; then
  echo "Error: Google Chrome not found at $CHROME" >&2
  exit 1
fi

echo "→ generating QR code for $URL"
QR_SVG="$(python3 - <<PY
import re, segno
qr = segno.make('$URL', error='m')
# Cream modules on transparent background so the QR sits directly on the
# dark card gradient without a white container box. border=2 gives the
# required quiet zone for reliable scanning.
svg = qr.svg_inline(scale=1, dark='#fff8ec', light=None, border=2)
# Inject a viewBox so CSS width/height can scale the QR to any size.
svg = re.sub(
    r'<svg width="(\d+)" height="(\d+)"',
    lambda m: f'<svg viewBox="0 0 {m.group(1)} {m.group(2)}" width="{m.group(1)}" height="{m.group(2)}"',
    svg, count=1,
)
print(svg)
PY
)"

echo "→ rendering HTML from template"
# Use python for substitution to avoid sed quoting headaches with the SVG.
QR_SVG="$QR_SVG" python3 - "$TEMPLATE" "$HTML_OUT" <<'PY'
import os, sys
tmpl = open(sys.argv[1]).read()
out  = tmpl.replace('<!--QR_CODE-->', os.environ['QR_SVG'])
open(sys.argv[2], 'w').write(out)
PY

echo "→ printing to PDF with headless Chrome"
"$CHROME" \
  --headless=new \
  --disable-gpu \
  --no-pdf-header-footer \
  --virtual-time-budget=10000 \
  --print-to-pdf="$PDF_OUT" \
  --print-to-pdf-no-header \
  "file://$HTML_OUT" 2>/dev/null

echo ""
echo "Done:"
echo "  HTML: $HTML_OUT"
echo "  PDF:  $PDF_OUT  ($(du -h "$PDF_OUT" | cut -f1))"
