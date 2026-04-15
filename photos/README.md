# Photos

Drop Yannick's photos in this folder (jpg / png / webp), then create a
`manifest.json` listing them. The site will automatically render them
in a grid with a lightbox.

## manifest.json format

Simplest form — just filenames:

```json
[
  "copenhagen.jpg",
  "skiing.jpg",
  "tennis-camp.jpg"
]
```

Or with alt text (better for accessibility):

```json
{
  "photos": [
    { "src": "copenhagen.jpg",   "alt": "Yannick on Nyhavn" },
    { "src": "skiing.jpg",       "alt": "Skiing in the Alps" },
    { "src": "tennis-camp.jpg",  "alt": "Tennis camp 2018" }
  ]
}
```

If `manifest.json` is missing or empty, the site shows a friendly
placeholder instead of the grid. So you can add photos whenever
you're ready — no deploy-day pressure.

## Sizes

For fast loading, resize photos to ≤ 1600 px on the long edge
before putting them here. Macro-tip:

```bash
# from the photos/ folder, resize in place with sips (macOS built-in)
for f in *.jpg *.jpeg *.png; do
  [ -e "$f" ] || continue
  sips -Z 1600 "$f"
done
```
