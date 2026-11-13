/* صفحه عمومی گالری: مسیریابی، فیلتر، چیدمان، لایت‌باکس */
(function () {
  'use strict';
  const G = window.G, $ = G.$, $$ = G.$$, esc = G.esc, fa = G.fa;
  let DATA, MODE = 'published', HAS_LOCAL = false;
  const S = { q: '', cat: '', sort: 'custom', featured: false, page: 1, view: '', album: '', drawn: 0, cols: [], h: [], routeHash: '#/' };
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const favs = () => new Set(LS.get('gal_favs', []));
  const catName = id => (DATA.categories.find(c => c.id === id) || {}).name || '';
  const albumObj = id => DATA.albums.find(a => a.id === id);
  const albumName = id => (albumObj(id) || {}).name || '';
  const imgById = id => DATA.images.find(i => i.id === id);
  const thumb = im => G.src(im.thumb || im.src);

  async function init() {
    G.fillIcons();
    const ti = () => { $('#btnTheme').innerHTML = G.icon(G.theme() === 'dark' ? 'sun' : 'moon'); };
    ti(); $('#btnTheme').addEventListener('click', () => { G.toggleTheme(); ti(); });
    let res;
    try { res = await G.Store.load({ preferPublished: !!LS.get('gal_use_published', false) }); }
    catch (e) { console.error(e); res = { data: G.normalize(null), mode: 'published' }; }
    DATA = res.data; MODE = res.mode; HAS_LOCAL = await G.Store.hasLocal();
    G.applySettings(DATA.settings);
    buildStatic(); bind(); route();
    window.addEventListener('hashchange', route);
    let lastCols = colCount();
    window.addEventListener('resize', G.debounce(() => { const c = colCount(); if (c !== lastCols) { lastCols = c; if (S.view === 'gallery' || S.view === 'favorites') drawGrid(false); } }, 200));
  }

  function buildStatic() {
    const s = DATA.settings;
    document.title = s.name; const md = $('meta[name=description]'); if (md) md.content = s.description;
    $('#brandName').textContent = s.name;
    const logo = G.src(s.logo); const bl = $('#brandLogo');
    if (logo) { bl.style.backgroundImage = `url("${logo}")`; bl.textContent = ''; } else { bl.style.backgroundImage = ''; bl.textContent = (s.name || 'گ').trim().charAt(0); }
    $('#heroTitle').textContent = s.name; $('#heroDesc').textContent = s.description;
    const b = G.src(s.banner);
    $('#heroBg').style.backgroundImage = b ? `linear-gradient(180deg,rgba(6,10,16,.3),rgba(6,10,16,.75)),url("${b}")` : '';
    $('#hero').classList.toggle('has-banner', !!b);
    $('#stats').innerHTML = [[DATA.images.length, 'تصویر'], [DATA.albums.length, 'آلبوم'], [DATA.categories.length, 'دسته‌بندی']].map(x => `<div class="stat"><b>${fa(x[0])}</b><span>${x[1]}</span></div>`).join('');
    $('#albumSel').innerHTML = '<option value="">همه آلبوم‌ها</option>' + DATA.albums.map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('');
    $('#albumSel').hidden = !DATA.albums.length;
    drawChips(); updateFavCount();
    $('#ctaShow').innerHTML = G.icon('play', 16) + ' اسلایدشو';
    $('#footName').textContent = `© ${fa(new Date().getFullYear())} ${s.name}`;
    const bar = $('#draftBar');
    if (MODE === 'local') { bar.hidden = false; bar.innerHTML = 'در حال نمایش پیش‌نویس محلی شما (منتشر نشده) <button id="swPub">نمایش نسخه منتشرشده</button>'; $('#swPub').onclick = () => { LS.set('gal_use_published', true); location.reload(); }; }
    else if (HAS_LOCAL) { bar.hidden = false; bar.innerHTML = 'نسخه منتشرشده نمایش داده می‌شود <button id="swLoc">نمایش پیش‌نویس محلی</button>'; $('#swLoc').onclick = () => { LS.set('gal_use_published', false); location.reload(); }; }
  }
  function drawChips() {
    const cats = DATA.categories.filter(c => DATA.images.some(i => i.category === c.id));
    $('#chips').innerHTML = `<button class="chip ${!S.cat && !S.featured ? 'on' : ''}" data-chip="">همه</button>` +
      (DATA.images.some(i => i.featured) ? `<button class="chip ${S.featured ? 'on' : ''}" data-chip="__feat">منتخب‌ها</button>` : '') +
      cats.map(c => `<button class="chip ${S.cat === c.id ? 'on' : ''}" data-chip="${esc(c.id)}">${esc(c.name)}</button>`).join('');
  }
  function updateFavCount() { const n = favs().size; $('#favCount').textContent = n ? fa(n) : ''; }

  /* ---------- مسیریابی ---------- */
  function route() {
    const h = location.hash || '#/';
    const m = h.match(/^#\/([^/]*)\/?(.*)$/), r = m ? m[1] : '', arg = m && m[2] ? decodeURIComponent(m[2]) : '';
    if (r === 'image') {
      if (!S.view) { S.view = 'gallery'; S.routeHash = '#/'; showView(); }
      const im = imgById(arg);
      if (im) { const list = filtered(); openLB(arg, list.some(i => i.id === arg) ? list : DATA.images.slice()); }
      else { G.toast('این تصویر پیدا نشد'); history.replaceState(null, '', location.pathname + location.search + '#/'); }
      return;
    }
    if (lb.open) closeLB(true);
    S.routeHash = h;
    S.album = r === 'album' && albumObj(arg) ? arg : '';
    S.view = r === 'albums' ? 'albums' : r === 'about' ? 'about' : r === 'favorites' ? 'favorites' : 'gallery';
    S.page = 1; showView(); window.scrollTo(0, 0);
  }
  function showView() {
    const v = S.view;
    $('#hero').hidden = !(v === 'gallery' && !S.album);
    $('#view-gallery').hidden = !(v === 'gallery' || v === 'favorites');
    $('#view-albums').hidden = v !== 'albums'; $('#view-about').hidden = v !== 'about';
    $('#albumHead').hidden = !S.album; $('#favHead').hidden = v !== 'favorites';
    if (S.album) $('#albumTitle').textContent = albumName(S.album);
    $('#albumSel').value = S.album;
    const active = S.album ? 'albums' : v;
    $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.route === active));
    if (v === 'gallery' || v === 'favorites') drawGrid(false);
    if (v === 'albums') renderAlbums();
    if (v === 'about') renderAbout();
  }

  /* ---------- فیلتر و چیدمان ---------- */
  function filtered() {
    let list = DATA.images.slice(); const q = G.norm(S.q.trim());
    if (S.album) list = list.filter(i => i.album === S.album);
    if (S.cat) list = list.filter(i => i.category === S.cat);
    if (S.featured) list = list.filter(i => i.featured);
    if (S.view === 'favorites') { const f = favs(); list = list.filter(i => f.has(i.id)); }
    if (q) list = list.filter(i => G.norm(i.title + ' ' + i.desc + ' ' + catName(i.category) + ' ' + albumName(i.album)).includes(q));
    if (S.sort === 'new') list.sort((a, b) => new Date(b.date) - new Date(a.date));
    else if (S.sort === 'old') list.sort((a, b) => new Date(a.date) - new Date(b.date));
    return list;
  }
  function colCount() {
    const w = innerWidth, max = (DATA && DATA.settings.columns) || 4;
    let c = max; if (w < 520) c = Math.min(max, 2); else if (w < 860) c = Math.min(max, 3); else if (w < 1200) c = Math.min(max, 4);
    return Math.max(1, c);
  }
  function drawGrid(append) {
    const host = $('#grid'), size = DATA.settings.pageSize || 24, list = filtered(), slice = list.slice(0, S.page * size);
    const tiles = DATA.settings.layout === 'grid', n = colCount();
    if (!append) {
      host.innerHTML = ''; S.drawn = 0; host.className = 'grid ' + (tiles ? 'tiles' : 'masonry'); host.style.setProperty('--cols', n);
      if (!tiles) { S.cols = []; S.h = new Array(n).fill(0); for (let i = 0; i < n; i++) { const c = document.createElement('div'); c.className = 'col'; host.appendChild(c); S.cols.push(c); } }
    }
    const fset = favs();
    slice.slice(S.drawn).forEach((im, k) => {
      const el = card(im, k, fset);
      if (tiles) host.appendChild(el);
      else { let m = 0; for (let i = 1; i < S.h.length; i++) if (S.h[i] < S.h[m]) m = i; S.cols[m].appendChild(el); S.h[m] += (im.h || 3) / (im.w || 4); }
    });
    S.drawn = slice.length;
    const total = DATA.images.length;
    $('#resultLine').textContent = list.length ? `${fa(list.length)} تصویر` + (S.q ? ` برای «${S.q}»` : '') : '';
    const empty = $('#empty'); empty.hidden = list.length > 0;
    if (!list.length) $('#emptyText').textContent = S.view === 'favorites' ? 'هنوز تصویری را به علاقه‌مندی‌ها اضافه نکرده‌اید. روی قلب هر تصویر بزنید.' : !total ? 'هنوز تصویری در گالری نیست. از بخش مدیریت تصاویر را اضافه کنید.' : 'تصویری با این فیلترها پیدا نشد.';
    const rest = list.length - slice.length; $('#moreBox').hidden = rest <= 0; $('#btnMore').textContent = `نمایش بیشتر (${fa(rest)} تصویر دیگر)`;
    $('#toolbar').hidden = !total;
  }
  function card(im, k, fset) {
    const el = document.createElement('figure'); el.className = 'card'; el.dataset.id = im.id; el.tabIndex = 0; el.setAttribute('role', 'button'); el.setAttribute('aria-label', im.title);
    el.style.setProperty('--ar', (im.w || 4) + '/' + (im.h || 3)); el.style.animationDelay = (k % 12) * 40 + 'ms,0ms';
    const cn = catName(im.category);
    el.innerHTML = `<img alt="${esc(im.title)}" width="${im.w || 400}" height="${im.h || 300}" loading="lazy" decoding="async"><figcaption class="overlay"><div><h3>${esc(im.title)}</h3>${cn ? `<span>${esc(cn)}</span>` : ''}</div></figcaption>${im.featured ? `<span class="badge">${G.icon('star', 12)} منتخب</span>` : ''}<button class="fav ${fset.has(im.id) ? 'on' : ''}" aria-label="علاقه‌مندی" title="علاقه‌مندی">${G.icon('heart', 18)}</button>`;
    const img = el.querySelector('img'), done = () => img.classList.add('loaded');
    img.addEventListener('load', done); img.addEventListener('error', done); img.src = thumb(im); if (img.complete && img.naturalWidth) done();
    return el;
  }
  function toggleFav(id) {
    const f = favs(); f.has(id) ? f.delete(id) : f.add(id); LS.set('gal_favs', [...f]); updateFavCount(); return f.has(id);
  }
  function renderAlbums() {
    const host = $('#albumGrid');
    if (!DATA.albums.length) { host.innerHTML = `<div class="empty">${G.icon('folder', 44)}<p>هنوز آلبومی ساخته نشده است.</p></div>`; return; }
    host.innerHTML = DATA.albums.map(a => {
      const imgs = DATA.images.filter(i => i.album === a.id), cov = imgById(a.coverId) || imgs[0];
      return `<a class="album-card" href="#/album/${encodeURIComponent(a.id)}"><div class="album-img">${cov ? `<img src="${thumb(cov)}" alt="" loading="lazy">` : G.icon('image', 40)}</div><div class="album-info"><h3>${esc(a.name)}</h3><span>${fa(imgs.length)} تصویر</span></div></a>`;
    }).join('');
  }
  function renderAbout() {
    const a = DATA.about, ph = G.src(a.photo);
    const paras = String(a.text || '').split(/\n+/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('');
    const soc = (a.socials || []).filter(s => s.url).map(s => `<a class="btn" href="${esc(G.safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">${esc(s.label || s.url)}</a>`).join('') + (a.email ? `<a class="btn" href="mailto:${esc(a.email)}">${esc(a.email)}</a>` : '');
    $('#aboutBox').innerHTML = `<div class="avatar" ${ph ? `style="background-image:url('${ph}')"` : ''}>${ph ? '' : G.icon('user', 56)}</div><h2>${esc(a.title || 'درباره ما')}</h2>${paras || '<p>هنوز متنی نوشته نشده است.</p>'}<div class="socials">${soc}</div>`;
  }

  /* ---------- رویدادها ---------- */
  function bind() {
    $('#q').addEventListener('input', G.debounce(e => { S.q = e.target.value; S.page = 1; drawGrid(false); }, 250));
    $('#sort').addEventListener('change', e => { S.sort = e.target.value; S.page = 1; drawGrid(false); });
    $('#albumSel').addEventListener('change', e => { location.hash = e.target.value ? '#/album/' + encodeURIComponent(e.target.value) : '#/'; });
    $('#chips').addEventListener('click', e => {
      const b = e.target.closest('[data-chip]'); if (!b) return; const v = b.dataset.chip;
      S.featured = v === '__feat'; S.cat = v === '__feat' ? '' : v; S.page = 1; drawChips(); drawGrid(false);
    });
    $('#btnMore').addEventListener('click', () => { S.page++; drawGrid(true); });
    $('#grid').addEventListener('click', e => {
      const c = e.target.closest('.card'); if (!c) return;
      if (e.target.closest('.fav')) {
        const on = toggleFav(c.dataset.id); c.querySelector('.fav').classList.toggle('on', on);
        if (S.view === 'favorites' && !on) drawGrid(false); return;
      }
      openLB(c.dataset.id, filtered());
    });
    $('#grid').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('card')) openLB(e.target.dataset.id, filtered()); });
    $('#ctaView').addEventListener('click', () => $('#toolbar').scrollIntoView({ behavior: 'smooth', block: 'start' }));
    const ss = () => startSlideshow(); $('#ctaShow').addEventListener('click', ss);
    $('#btnSlideshow').innerHTML = G.icon('play'); $('#btnSlideshow').addEventListener('click', ss);
    bindLB();
  }

  /* ---------- لایت‌باکس ---------- */
  const lb = { open: false, list: [], idx: 0, cur: null, scale: 1, x: 0, y: 0, timer: null, playing: false };
  function openLB(id, list) {
    lb.list = list && list.length ? list : DATA.images.slice();
    let i = lb.list.findIndex(x => x.id === id); if (i < 0) { lb.list = DATA.images.slice(); i = lb.list.findIndex(x => x.id === id); }
    if (i < 0) return;
    const el = $('#lb'); el.hidden = false; el.setAttribute('aria-hidden', 'false'); document.body.classList.add('lock');
    requestAnimationFrame(() => el.classList.add('show')); lb.open = true; showLB(i); el.focus();
  }
  function closeLB(silent) {
    playLB(false); lb.open = false; const el = $('#lb'); el.classList.remove('show'); el.hidden = true; el.setAttribute('aria-hidden', 'true'); document.body.classList.remove('lock');
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    if (!silent && location.hash.startsWith('#/image/')) history.replaceState(null, '', location.pathname + location.search + (S.routeHash || '#/'));
  }
  function showLB(i) {
    const list = lb.list; lb.idx = (i + list.length) % list.length; const im = list[lb.idx]; lb.cur = im;
    resetZoom();
    const img = $('#lbImg'), stage = $('#lbStage'); img.classList.remove('ready'); stage.classList.add('loading');
    const done = () => { img.classList.add('ready'); stage.classList.remove('loading'); };
    img.onload = done; img.onerror = done; img.src = G.src(im.src); img.alt = im.title;
    $('#lbTitle').textContent = im.title; $('#lbDesc').textContent = im.desc || ''; $('#lbDesc').hidden = !im.desc;
    const v = LS.get('gal_views', {}); v[im.id] = (v[im.id] || 0) + 1; LS.set('gal_views', v);
    const meta = []; if (catName(im.category)) meta.push(catName(im.category)); if (albumName(im.album)) meta.push('آلبوم: ' + albumName(im.album));
    if (im.date) meta.push(G.fmtDate(im.date)); meta.push(fa(v[im.id]) + ' بازدید');
    $('#lbMeta').innerHTML = meta.map(m => `<span>${esc(m)}</span>`).join('');
    $('#lbCount').textContent = `${fa(lb.idx + 1)} از ${fa(list.length)}`;
    $('#lbFav').classList.toggle('on', favs().has(im.id));
    const sim = DATA.images.filter(x => x.id !== im.id).map(x => ({ x, s: (im.album && x.album === im.album ? 3 : 0) + (im.category && x.category === im.category ? 2 : 0) })).filter(o => o.s > 0).sort((a, b) => b.s - a.s).slice(0, 10).map(o => o.x);
    $('#lbSimilar').hidden = !sim.length;
    $('#lbSimilar').innerHTML = sim.length ? '<div class="lb-sim-title">تصاویر مشابه</div><div class="lb-strip">' + sim.map(s => `<button data-id="${esc(s.id)}" title="${esc(s.title)}"><img src="${thumb(s)}" alt=""></button>`).join('') + '</div>' : '';
    if (list.length > 1) [lb.idx + 1, lb.idx - 1].forEach(k => { const n = list[(k + list.length) % list.length]; if (n) new Image().src = G.src(n.src); });
    $('#lbPrev').hidden = $('#lbNext').hidden = list.length < 2;
    schedule();
  }
  const next = () => showLB(lb.idx + 1), prev = () => showLB(lb.idx - 1);
  function schedule() {
    clearTimeout(lb.timer); const p = $('#lbProg'); p.classList.remove('run');
    if (!lb.playing) return; void p.offsetWidth; p.classList.add('run'); lb.timer = setTimeout(next, 4000);
  }
  function playLB(on) { lb.playing = on; $('#lbPlay').innerHTML = G.icon(on ? 'pause' : 'play'); $('#lbPlay').title = on ? 'توقف اسلایدشو' : 'اسلایدشو'; schedule(); }
  function startSlideshow() {
    const list = filtered(); if (!list.length) { G.toast('تصویری برای نمایش وجود ندارد'); return; }
    openLB(list[0].id, list); playLB(true); const el = $('#lb'); if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }
  function apply() { $('#lbImg').style.transform = `translate(${lb.x}px,${lb.y}px) scale(${lb.scale})`; $('#lbStage').classList.toggle('zoomed', lb.scale > 1); }
  function resetZoom() { lb.scale = 1; lb.x = lb.y = 0; apply(); }
  function zoomBy(f) { lb.scale = Math.min(6, Math.max(1, lb.scale * f)); if (lb.scale === 1) { lb.x = lb.y = 0; } apply(); }
  function imgName(im) { return im.fileName || (String(im.src).split('/').pop()) || 'image.jpg'; }
  function bindLB() {
    $('#lbClose').onclick = () => closeLB(); $('#lbNext').onclick = next; $('#lbPrev').onclick = prev;
    $('#lbZoomIn').onclick = () => zoomBy(1.4); $('#lbZoomOut').onclick = () => zoomBy(1 / 1.4); $('#lbReset').onclick = resetZoom;
    $('#lbPlay').onclick = () => playLB(!lb.playing);
    $('#lbFull').onclick = () => { const el = $('#lb'); if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); };
    $('#lbFav').onclick = () => { $('#lbFav').classList.toggle('on', toggleFav(lb.cur.id)); const c = $(`.card[data-id="${CSS.escape(lb.cur.id)}"] .fav`); if (c) c.classList.toggle('on', favs().has(lb.cur.id)); };
    $('#lbDownload').onclick = () => { const a = document.createElement('a'); a.href = G.src(lb.cur.src); a.download = imgName(lb.cur); document.body.appendChild(a); a.click(); a.remove(); };
    $('#lbShare').onclick = async () => {
      const url = location.href.split('#')[0] + '#/image/' + encodeURIComponent(lb.cur.id);
      if (navigator.share) { try { await navigator.share({ title: lb.cur.title, url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
      G.toast((await G.copy(url)) ? 'لینک صفحه تصویر کپی شد' : 'کپی انجام نشد', 'ok');
    };
    $('#lbCopy').onclick = async () => {
      const s = lb.cur.src; if (String(s).startsWith('local:')) { G.toast('این تصویر هنوز منتشر نشده و لینک عمومی ندارد'); return; }
      G.toast((await G.copy(new URL(s, document.baseURI).href)) ? 'لینک مستقیم تصویر کپی شد' : 'کپی انجام نشد', 'ok');
    };
    $('#lbSimilar').addEventListener('click', e => {
      const b = e.target.closest('button[data-id]'); if (!b) return; let i = lb.list.findIndex(x => x.id === b.dataset.id);
      if (i < 0) { lb.list = DATA.images.slice(); i = lb.list.findIndex(x => x.id === b.dataset.id); } showLB(i);
    });
    document.addEventListener('keydown', e => {
      if (!lb.open || document.querySelector('.modal-backdrop')) return;
      if (e.key === 'Escape') closeLB(); else if (e.key === 'ArrowLeft') next(); else if (e.key === 'ArrowRight') prev();
      else if (e.key === '+' || e.key === '=') zoomBy(1.4); else if (e.key === '-') zoomBy(1 / 1.4); else if (e.key === '0') resetZoom();
    });
    const stage = $('#lbStage'), pts = new Map(); let d0 = 0, s0 = 1, sx = 0, sy = 0, base = { x: 0, y: 0 }, swipe = false;
    stage.addEventListener('wheel', e => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    stage.addEventListener('dblclick', () => { lb.scale > 1 ? resetZoom() : (lb.scale = 2.5, apply()); });
    stage.addEventListener('pointerdown', e => {
      stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { const [a, b] = [...pts.values()]; d0 = Math.hypot(a.x - b.x, a.y - b.y); s0 = lb.scale; swipe = false; }
      else { sx = e.clientX; sy = e.clientY; base = { x: lb.x, y: lb.y }; swipe = true; stage.classList.add('dragging'); }
    });
    stage.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { const [a, b] = [...pts.values()]; lb.scale = Math.min(6, Math.max(1, s0 * Math.hypot(a.x - b.x, a.y - b.y) / (d0 || 1))); apply(); }
      else if (lb.scale > 1) { lb.x = base.x + e.clientX - sx; lb.y = base.y + e.clientY - sy; apply(); }
    });
    const end = e => {
      if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
      if (!pts.size) {
        stage.classList.remove('dragging');
        if (swipe && lb.scale === 1) { const dx = e.clientX - sx; if (Math.abs(dx) > 60 && Math.abs(e.clientY - sy) < 90) dx < 0 ? next() : prev(); }
        if (lb.scale <= 1) resetZoom(); swipe = false;
      }
    };
    stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  }
  init();
})();
