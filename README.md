# brigger.dk

A birthday gift website for Yannick. Static HTML / CSS / JS — no build step,
no backend, no dependencies beyond the Google Fonts CDN.

The site opens with a gift-box unwrap animation, then reveals a cheerful
landing page with fun facts, a photo gallery, a timeline, his CV, and a
note from Papa.

## Local preview

```bash
cd ~/Documents/brigger.dk
python3 -m http.server 8765
# then open http://localhost:8765
```

## Structure

```
brigger.dk/
├── index.html               ← the page
├── styles.css               ← all styling
├── script.js                ← unwrap, confetti, gallery, easter egg
├── YannickBriggerResume.pdf ← linked from the CV section
├── photos/
│   ├── README.md            ← how to add photos + manifest format
│   └── manifest.json        ← (you create this when photos land)
└── README.md                ← this file
```

## Adding photos

Drop images in `photos/`, then create `photos/manifest.json`. See
[`photos/README.md`](photos/README.md) for the exact format. Until the
manifest exists, the gallery section shows a friendly placeholder.

## Deployment to the VPS

The site follows the same static-site pattern as `brigger.com` and
`velis-planner` — it's served directly from `/var/www/brigger.dk/` by the
host nginx (no Docker).

**One-time setup on the VPS:**

```bash
ssh root@95.217.222.205

# 1. Clone the site (after you've created a brigger/brigger.dk repo)
mkdir -p /var/www/brigger.dk
git clone github-infra:brigger/brigger.dk.git /var/www/brigger.dk
#    …or add a dedicated deploy key (github-brigger-dk) if you prefer.

# 2. Install the nginx config from vps-infrastructure
cp /opt/docker/nginx/brigger.dk.conf /etc/nginx/sites-available/brigger.dk
ln -sf /etc/nginx/sites-available/brigger.dk /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 3. Point DNS (at your registrar): A record brigger.dk → 95.217.222.205
#    plus A record www.brigger.dk → 95.217.222.205

# 4. Issue TLS certificate
certbot --nginx -d brigger.dk -d www.brigger.dk
```

**Updating later:**

```bash
ssh root@95.217.222.205 "cd /var/www/brigger.dk && git pull"
```

No nginx reload, no cache bust — just pull and it's live.

## Easter egg

Type the Konami code (↑ ↑ ↓ ↓ ← → ← → B A) anywhere on the site for a
surprise. Don't tell Yannick.
