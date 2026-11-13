/* ابزارهای عمومی: انتخابگر، آیکون، مودال، اعلان، تم، پردازش تصویر */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  G.$ = (s, r = document) => r.querySelector(s);
  G.$$ = (s, r = document) => [...r.querySelectorAll(s)];
  G.uid = p => (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  G.fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  G.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  G.norm = s => String(s || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').toLowerCase();
  G.debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  G.fmtDate = iso => { try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso)); } catch (e) { return ''; } };
  G.safeUrl = u => { u = String(u || '').trim(); if (/^(https?:|mailto:|tel:)/i.test(u)) return u; if (/^[\w.-]+\.[a-z]{2,}/i.test(u)) return 'https://' + u; return '#'; };

  const P = {
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    chevL: '<path d="M15 18l-6-6 6-6"/>', chevR: '<path d="M9 18l6-6-6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    play: '<path d="M6 4l14 8-14 8z"/>', pause: '<path d="M8 5v14M16 5v14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    expand: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    check: '<path d="M20 6L9 17l-5-5"/>', eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'
  };
  G.icon = (n, s = 20) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
  G.fillIcons = () => G.$$('[data-icon]').forEach(e => { e.innerHTML = G.icon(e.dataset.icon, +e.dataset.size || 20); });

  G.theme = () => document.documentElement.getAttribute('data-theme') || 'light';
  G.toggleTheme = () => { const t = G.theme() === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('gal_theme', t); } catch (e) {} return t; };

  G.applySettings = s => {
    const a = /^#[0-9a-f]{6}$/i.test(s.accent) ? s.accent : '#12a594';
    const st = document.documentElement.style; st.setProperty('--accent', a);
    const n = parseInt(a.slice(1), 16), L = (0.299 * (n >> 16) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255;
    st.setProperty('--accent-contrast', L > 0.62 ? '#111' : '#fff');
    const fav = G.$('#favicon');
    if (fav) { const l = G.src(s.logo); fav.href = l || `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='9' fill='${encodeURIComponent(a)}'/><circle cx='16' cy='16' r='6' fill='white'/></svg>`; }
  };

  G.toast = (msg, type = '') => {
    let box = G.$('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; box.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3100);
  };
  G.download = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); };
  G.copy = async text => {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (_) {} ta.remove(); return ok;
    }
  };

  G.modal = (html, opts = {}) => {
    const bd = document.createElement('div'); bd.className = 'modal-backdrop';
    bd.innerHTML = `<div class="modal ${opts.cls || ''}" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(bd);
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    const close = v => { document.removeEventListener('keydown', onKey, true); bd.remove(); if (opts.onClose) opts.onClose(v); };
    document.addEventListener('keydown', onKey, true);
    bd.addEventListener('mousedown', e => { if (e.target === bd) close(); });
    bd.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => close()));
    requestAnimationFrame(() => bd.classList.add('show'));
    return { el: bd.firstElementChild, close };
  };
  G.confirm = (msg, okText = 'تأیید', danger = true) => new Promise(res => {
    let done = false;
    const m = G.modal(`<p class="modal-text">${G.esc(msg)}</p><div class="modal-actions"><button class="btn" data-close>انصراف</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${G.esc(okText)}</button></div>`, { onClose: () => { if (!done) res(false); } });
    m.el.querySelector('[data-ok]').onclick = () => { done = true; res(true); m.close(); };
  });
  G.prompt = (title, value = '', ph = '') => new Promise(res => {
    let done = false;
    const m = G.modal(`<h3>${G.esc(title)}</h3><input class="input" id="pm" value="${G.esc(value)}" placeholder="${G.esc(ph)}"><div class="modal-actions"><button class="btn" data-close>انصراف</button><button class="btn primary" data-ok>تأیید</button></div>`, { onClose: () => { if (!done) res(null); } });
    const inp = m.el.querySelector('#pm'); inp.focus(); inp.select();
    const ok = () => { done = true; res(inp.value.trim()); m.close(); };
    m.el.querySelector('[data-ok]').onclick = ok; inp.onkeydown = e => { if (e.key === 'Enter') ok(); };
  });

  G.extOf = (type, name) => {
    const m = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/avif': 'avif' }[type];
    if (m) return m; const x = /\.([a-z0-9]{2,4})$/i.exec(name || ''); return x ? x[1].toLowerCase() : 'jpg';
  };
  G.loadImg = url => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image')); i.src = url; });
  const isSvg = f => /svg/.test(f.type) || /\.svg$/i.test(f.name || '');
  G.resizeImage = async (file, max, mime = 'image/jpeg', q = 0.86) => {
    if (isSvg(file)) return file;
    const url = URL.createObjectURL(file);
    try {
      const img = await G.loadImg(url);
      const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.naturalWidth * sc)); c.height = Math.max(1, Math.round(img.naturalHeight * sc));
      const x = c.getContext('2d'); if (mime === 'image/jpeg') { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
      x.drawImage(img, 0, 0, c.width, c.height);
      return await new Promise(r => c.toBlob(r, mime, q));
    } finally { URL.revokeObjectURL(url); }
  };
  G.processFile = async file => {
    const url = URL.createObjectURL(file);
    try {
      const img = await G.loadImg(url);
      const w = img.naturalWidth || 1200, h = img.naturalHeight || 800;
      let thumb = null;
      if (!isSvg(file) && !/gif/.test(file.type) && Math.max(w, h) > 1000) thumb = await G.resizeImage(file, 900, 'image/jpeg', 0.82);
      return { w, h, thumb };
    } finally { URL.revokeObjectURL(url); }
  };
})();
