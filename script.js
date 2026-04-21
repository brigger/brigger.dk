/* =========================================================
   brigger.dk — little birthday site
   ========================================================= */
(() => {

  /* ------------ Gift box unwrap ------------ */
  const giftBox  = document.getElementById('giftBox');
  const giftScene = document.getElementById('gift-scene');
  const site     = document.getElementById('site');
  let opened = false;

  function openGift() {
    if (opened) return;
    opened = true;
    giftBox.classList.add('opened');
    burstConfetti();
    setTimeout(() => {
      giftScene.classList.add('done');
      site.setAttribute('aria-hidden', 'false');
      site.classList.add('live');
      document.body.style.overflow = 'auto';
      startLanguageCycle();
    }, 900);
    setTimeout(() => { giftScene.remove(); }, 1800);
  }
  if (giftBox) {
    giftBox.addEventListener('click', openGift);
    giftBox.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGift(); }
    });
    document.body.style.overflow = 'hidden';
  }


  /* ------------ Confetti burst ------------ */
  const canvas = document.getElementById('confetti');
  const ctx = canvas ? canvas.getContext('2d') : null;
  function sizeCanvas() {
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth  * devicePixelRatio;
    canvas.height = canvas.offsetHeight * devicePixelRatio;
  }
  if (canvas) {
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
  }

  const colors = ['#ffd166', '#ef476f', '#06d6a0', '#4cc9f0', '#fff8ec', '#f78fb3'];
  let pieces = [];

  function burstConfetti() {
    if (!canvas) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const n = 160;
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n + Math.random() * 0.3;
      const speed = (6 + Math.random() * 10) * devicePixelRatio;
      pieces.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        size: (6 + Math.random() * 8) * devicePixelRatio,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
      });
    }
    requestAnimationFrame(animate);
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.vy += 0.25 * devicePixelRatio;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - p.life / 180);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.4);
      ctx.restore();
    });
    pieces = pieces.filter(p => p.life < 200 && p.y < canvas.height + 50);
    if (pieces.length > 0) requestAnimationFrame(animate);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }


  /* ------------ Language cycle on hero ------------ */
  const wishEl = document.getElementById('wish');
  const wishes = [
    'Happy Birthday',        // English
    'Herzlichen Geburtstag', // German
    'Joyeux Anniversaire',   // French
    'Feliz Cumpleaños',      // Spanish
    'Tillykke med fødselsdagen', // Danish
  ];
  let wishIdx = 0;
  function startLanguageCycle() {
    if (!wishEl) return;
    setInterval(() => {
      wishIdx = (wishIdx + 1) % wishes.length;
      wishEl.style.opacity = 0;
      setTimeout(() => {
        wishEl.textContent = wishes[wishIdx];
        wishEl.style.opacity = 1;
      }, 300);
    }, 2800);
    wishEl.style.transition = 'opacity 280ms ease';
  }


  /* ------------ Photo gallery ------------ */
  const grid = document.getElementById('photoGrid');
  const placeholder = document.getElementById('photoPlaceholder');
  const photos = []; // {full, alt} — populated from manifest, shared with lightbox
  let totalPhotos = 0;
  let shownCount  = 0;

  function updateGalleryCta() {
    const cta = document.getElementById('galleryCta');
    if (!cta) return;
    if (isUnlocked() && totalPhotos > shownCount) {
      cta.hidden = false;
      const link = cta.querySelector('a');
      if (link) link.textContent = `See all ${totalPhotos} photos →`;
    } else {
      cta.hidden = true;
    }
  }

  fetch('photos/manifest.json', { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error('no manifest'); return r.json(); })
    .then(data => {
      const list = Array.isArray(data) ? data : (data.photos || []);
      if (list.length === 0) return;
      placeholder.classList.add('hidden');
      const limit = parseInt(grid.dataset.limit || '0', 10);
      const shown = limit > 0 ? list.slice(0, limit) : list;
      totalPhotos = list.length;
      shownCount  = shown.length;
      shown.forEach((item, i) => {
        const src   = typeof item === 'string' ? item : item.src;
        const thumb = typeof item === 'string' ? item : (item.thumb || item.src);
        const alt   = typeof item === 'string' ? '' : (item.alt || '');
        photos.push({ full: 'photos/' + src, alt });
        const img = document.createElement('img');
        img.src = 'photos/' + thumb;
        img.alt = alt;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('click', () => openLightbox(i));
        grid.appendChild(img);
      });
      updateGalleryCta();
    })
    .catch(() => { /* placeholder stays */ });


  /* ------------ Password curtain ------------
     Client-side only — theatrical, not secure. Photos are on a public URL.
     Password: "brigger.dk" (case-insensitive). Session-scoped unlock. */
  const SECRET     = 'brigger.dk';
  const UNLOCK_KEY = 'brigger.dk.unlocked';
  function isUnlocked() {
    try { return localStorage.getItem(UNLOCK_KEY) === '1'; } catch { return false; }
  }
  function setUnlocked() {
    try { localStorage.setItem(UNLOCK_KEY, '1'); } catch {}
  }

  const curtains = Array.from(document.querySelectorAll('.curtain'));

  // Password modal (created lazily, shared across pages)
  let pwModal = null;
  function ensurePasswordModal() {
    if (pwModal) return pwModal;
    pwModal = document.createElement('div');
    pwModal.className = 'password-modal';
    pwModal.setAttribute('aria-hidden', 'true');
    pwModal.setAttribute('role', 'dialog');
    pwModal.setAttribute('aria-labelledby', 'passwordTitle');
    pwModal.innerHTML = `
      <div class="password-card">
        <button type="button" class="password-close" aria-label="Close">×</button>
        <span class="password-icon" aria-hidden="true">🎭</span>
        <h3 id="passwordTitle">Private Gallery</h3>
        <p>Dad's little corner — enter the password to pull back the curtain.</p>
        <form id="passwordForm" novalidate>
          <input type="password" id="passwordInput" autocomplete="off"
                 autocapitalize="none" spellcheck="false" placeholder="Password…">
          <button type="submit" class="btn primary">Open the curtain</button>
        </form>
        <p class="password-error" id="passwordError" hidden>Not quite — try again.</p>
        <p class="password-hint">Hint: it's the domain you're on.</p>
      </div>
    `;
    document.body.appendChild(pwModal);

    const form  = pwModal.querySelector('#passwordForm');
    const input = pwModal.querySelector('#passwordInput');
    const error = pwModal.querySelector('#passwordError');
    const close = pwModal.querySelector('.password-close');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = (input.value || '').trim().toLowerCase();
      if (value === SECRET) {
        error.hidden = true;
        closePasswordModal();
        openCurtains({ animate: true });
      } else {
        error.hidden = false;
        input.classList.remove('shake');
        void input.offsetWidth; // restart animation
        input.classList.add('shake');
        input.select();
      }
    });
    close.addEventListener('click', closePasswordModal);
    pwModal.addEventListener('click', (e) => {
      if (e.target === pwModal) closePasswordModal();
    });
    return pwModal;
  }

  function openPasswordModal() {
    const m = ensurePasswordModal();
    m.classList.add('visible');
    m.setAttribute('aria-hidden', 'false');
    const input = m.querySelector('#passwordInput');
    const error = m.querySelector('#passwordError');
    if (input) { input.value = ''; setTimeout(() => input.focus(), 50); }
    if (error) error.hidden = true;
  }
  function closePasswordModal() {
    if (!pwModal) return;
    pwModal.classList.remove('visible');
    pwModal.setAttribute('aria-hidden', 'true');
  }

  function openCurtains({ animate = true } = {}) {
    setUnlocked();
    curtains.forEach(c => {
      if (animate) {
        c.classList.add('opening');
        setTimeout(() => c.classList.add('open'), 1900);
      } else {
        c.classList.add('open');
      }
    });
    updateGalleryCta();
  }

  if (curtains.length) {
    if (isUnlocked()) {
      curtains.forEach(c => c.classList.add('open'));
    } else {
      curtains.forEach(c => {
        c.addEventListener('click', openPasswordModal);
        c.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPasswordModal(); }
        });
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && pwModal && pwModal.classList.contains('visible')) {
          closePasswordModal();
        }
      });
    }
  }


  /* ------------ Lightbox with prev/next ------------ */
  let lightbox = document.getElementById('lightbox');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    lightbox.innerHTML = `
      <button type="button" class="lb-btn lb-prev" aria-label="Previous photo">‹</button>
      <img alt="">
      <button type="button" class="lb-btn lb-next" aria-label="Next photo">›</button>
      <button type="button" class="lb-btn lb-close" aria-label="Close">×</button>
    `;
    document.body.appendChild(lightbox);
  }
  const lbImg   = lightbox.querySelector('img');
  const lbPrev  = lightbox.querySelector('.lb-prev');
  const lbNext  = lightbox.querySelector('.lb-next');
  const lbClose = lightbox.querySelector('.lb-close');
  let lbIndex = 0;

  function showPhoto(i) {
    if (photos.length === 0) return;
    lbIndex = (i + photos.length) % photos.length;
    const p = photos[lbIndex];
    lbImg.src = p.full;
    lbImg.alt = p.alt;
  }
  function openLightbox(i) {
    showPhoto(i);
    lightbox.classList.add('visible');
  }
  function closeLightbox() { lightbox.classList.remove('visible'); }

  lbPrev.addEventListener('click',  (e) => { e.stopPropagation(); showPhoto(lbIndex - 1); });
  lbNext.addEventListener('click',  (e) => { e.stopPropagation(); showPhoto(lbIndex + 1); });
  lbClose.addEventListener('click', (e) => { e.stopPropagation(); closeLightbox(); });
  lbImg.addEventListener('click',   (e) => e.stopPropagation());
  lightbox.addEventListener('click', closeLightbox); // click on backdrop closes

  window.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('visible')) return;
    if (e.key === 'ArrowLeft')  { e.preventDefault(); showPhoto(lbIndex - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); showPhoto(lbIndex + 1); }
    if (e.key === 'Escape')     { e.preventDefault(); closeLightbox(); }
  });


  /* ------------ Reveal on scroll ------------ */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));


  /* ------------ Easter egg: Konami code ------------ */
  const konami = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let konamiIdx = 0;
  window.addEventListener('keydown', (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === konami[konamiIdx]) {
      konamiIdx++;
      if (konamiIdx === konami.length) {
        konamiIdx = 0;
        partyMode();
      }
    } else {
      konamiIdx = 0;
    }
  });

  function partyMode() {
    if (!canvas) return;
    // Make sure the canvas is on top for the party
    canvas.style.position = 'fixed';
    canvas.style.inset = 0;
    canvas.style.zIndex = 9999;
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);
    sizeCanvas();
    let bursts = 0;
    const id = setInterval(() => {
      burstConfetti();
      bursts++;
      if (bursts > 6) clearInterval(id);
    }, 400);
  }

})();
