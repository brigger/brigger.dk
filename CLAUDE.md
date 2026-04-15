# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page static birthday gift site for Yannick. Pure HTML/CSS/JS — no build step, no bundler, no dependencies beyond the Google Fonts CDN. Everything in `index.html`, `styles.css`, `script.js`. Deployed to a shared Hetzner VPS (`95.217.222.205`) as static files served by host nginx, same pattern as the sibling `brigger.com` site.

## Common commands

```bash
# Local preview
python3 -m http.server 8765   # then open http://localhost:8765

# Resize original photos → web + thumb sizes + regenerate manifest.json
./scripts/optimize-photos.sh

# Deploy to VPS (after DNS is live and site is set up)
./deploy.sh

# First-time VPS setup: rsync + nginx vhost install + certbot
./deploy.sh --setup
```

There are no tests, no linter, no package manager.

## Architecture

### Two-scene page flow
`index.html` contains both scenes; `script.js` drives the transition:
1. **`#gift-scene`** — fullscreen gift box; click/Enter unwraps, triggers a canvas confetti burst, then fades away.
2. **`#site`** (`aria-hidden="true"` until unwrap) — hero, about cards, photo gallery, timeline, CV, note, footer. Reveal-on-scroll via a single `IntersectionObserver` watching `.reveal` elements.

The hero headline cycles through five languages via `startLanguageCycle()` once the site becomes visible. The Konami code triggers `partyMode()` (repeated confetti bursts) — the same canvas is reused and re-parented to `body` with `z-index: 9999`.

### Photo pipeline — two-tier resize

Photos are the one part that needs a pre-step. Originals live in `photos/Yannick/` (~1.8 GB of UUID-named JPEG/PNG/video files straight from phones). The site never serves these. Run `scripts/optimize-photos.sh` to produce two derivatives using macOS `sips`:

| Directory               | Max dimension | Quality | Used for            |
|-------------------------|---------------|---------|---------------------|
| `photos/Yannick-web/`   | 1920 px       | 82      | Lightbox (full)     |
| `photos/Yannick-thumb/` | 600 px        | 75      | Grid tiles          |

The script is idempotent (skips files whose output already exists), parallel (`xargs -P 8`), and skips `.mov`/`.mp4`. It also regenerates `photos/manifest.json` as `{"photos": [{"thumb": "Yannick-thumb/X.jpg", "src": "Yannick-web/X.jpg"}, ...]}`.

`script.js` loads the manifest at runtime and hydrates `#photoGrid`. Each `<img>` uses the thumb as `src` (lazy-loaded) and stores the full-size path in `data-full`, which the click handler passes to the lightbox. Supports the legacy string/`{src, alt}` manifest shapes too for backward compatibility.

**Important:** `photos/Yannick/` is excluded from `deploy.sh` and should never be pushed to the VPS (1.8 GB). Only the two resized directories ship.

### Deploy model

Static files live at `/var/www/brigger.dk/` on the VPS, served by host nginx (not Docker — the VPS's Docker stack is for other projects, see `../vps-infrastructure/`). `deploy.sh` rsyncs the site excluding `.git/`, `scripts/`, `photos/Yannick/`, `photos/README.md`, and `deploy.sh` itself.

The nginx vhost lives in `../vps-infrastructure/nginx/brigger.dk.conf` as **reference only** — once installed and Certbot has touched it, the live file on the VPS diverges (SSL block appended). Don't edit the live vhost from this repo expecting it to sync.

### DNS / activation state (current)

The domain is registered through Hostpoint (reselling via Ascio Technologies, Denmark). DNS zone is hosted at Hostpoint with `A brigger.dk → 95.217.222.205` already set. At time of writing, `.dk` TLD delegation shows `nonexistent.punktum.dk` because Punktum holds the domain in `Status: Reserved` — pending registrant verification that Hostpoint/Ascio must re-trigger. Public DNS won't resolve until that clears. `./deploy.sh --setup` will fail at the certbot step until then.

## Sibling repos on the same VPS

See `../vps-infrastructure/README.md` for the host-level picture: shared nginx + Docker Compose stack, MariaDB, PHPMyAdmin, certbot. brigger.dk is one of the static-file tenants (like `brigger.com` and `velis-planner`), not part of the Docker stack.

## Files worth knowing

- `script.js:117-135` — manifest fetch and grid hydration. Change here if you add image captions or want a fancier lightbox.
- `scripts/optimize-photos.sh` — if you change the target sizes/quality, re-run it; it won't re-process files unless you delete the outputs first.
- `deploy.sh` — rsync excludes list. Add new top-level files you don't want on the VPS here.
- `../vps-infrastructure/nginx/brigger.dk.conf` — reference nginx config. The `Yannick-web/` and `Yannick-thumb/` paths have a 30-day immutable cache rule (safe because the UUID filenames never change content).

## Easter egg

Konami code (↑ ↑ ↓ ↓ ← → ← → B A) triggers party mode. Don't tell Yannick.
