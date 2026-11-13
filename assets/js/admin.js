/* پنل مدیریت: تصاویر، آلبوم‌ها، تنظیمات، درباره، انتشار */
(function () {
  'use strict';
  const G = window.G, $ = G.$, $$ = G.$$, esc = G.esc, fa = G.fa;
  let DATA, MODE;
  const ST = { tab: 'images', q: '', cat: '', album: '', sel: new Set(), staged: [], saving: false };
  const TABS = [['images', 'تصاویر', 'image'], ['albums', 'آلبوم‌ها', 'folder'], ['settings', 'تنظیمات', 'sliders'], ['about', 'درباره ما', 'user'], ['publish', 'انتشار و خروجی', 'upload']];
  const ACCENTS = ['#12a594', '#2f6bff', '#7c5cff', '#e5484d', '#f59e0b', '#16a34a', '#db2777', '#0f172a'];

  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
  const img = id => DATA.images.find(i => i.id === id);
  const albumObj = id => DATA.albums.find(a => a.id === id);
  const catName = id => (DATA.categories.find(c => c.id === id) || {}).name || '';
  const albumName = id => (albumObj(id) || {}).name || '';
  const thumb = im => G.src(im.thumb || im.src);
  const isCover = im => { const a = albumObj(im.album); return !!a && a.coverId === im.id; };
  const catOpts = (sel, all) => (all !== undefined ? `<option value="">${all}</option>` : '') + DATA.categories.map(c => `<option value="${esc(c.id)}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  const albOpts = (sel, all) => (all !== undefined ? `<option value="">${all}</option>` : '') + DATA.albums.map(a => `<option value="${esc(a.id)}" ${a.id === sel ? 'selected' : ''}>${esc(a.name)}</option>`).join('');
  function setAlbum(im, albumId) { const old = albumObj(im.album); if (old && old.coverId === im.id) old.coverId = ''; im.album = albumId; }

  /* ---------- ذخیره خودکار ---------- */
  const saveSoon = G.debounce(async () => {
    try { await G.Store.save(DATA); setSave('ok'); } catch (e) { console.error(e); setSave('err'); G.toast('ذخیره انجام نشد (فضای مرورگر پر است؟)', 'err'); }
  }, 350);
  function setSave(s) { ST.saving = s === 'saving'; const el = $('#saveState'); el.className = 'save ' + s; el.textContent = { ok: '✓ ذخیره شد', saving: 'در حال ذخیره…', err: 'خطا در ذخیره', idle: MODE === 'local' ? 'پیش‌نویس محلی' : 'نسخه منتشرشده (تغییری ثبت نشده)' }[s]; }
  function touch() { setSave('saving'); ls.set('gal_dirty', '1'); G.applySettings(DATA.settings); chrome(); pubState(); saveSoon(); }
  function pubState() {
    const b = $('#btnPub'); if (!b || b.disabled) return; const dirty = ls.get('gal_dirty') === '1';
    b.classList.toggle('primary', dirty); b.textContent = dirty ? 'انتشار تغییرات روی سایت' : 'انتشار روی سایت';
  }
  async function publishNow(btn, restore) {
    const cfg = G.GitHub.getCfg();
    if (!cfg.token || !cfg.owner || !cfg.repo) { G.toast('ابتدا اتصال GitHub را در بخش «انتشار و خروجی» تنظیم کنید'); ST.tab = 'publish'; render(); return; }
    btn.disabled = true;
    try {
      await G.Store.save(DATA);
      const r = await G.GitHub.publish(cfg, DATA, m => { btn.textContent = m; });
      ls.del('gal_dirty');
      G.toast(r.unchanged ? 'تغییر جدیدی برای انتشار نبود' : 'منتشر شد؛ تا ۱ تا ۲ دقیقه دیگر روی سایت دیده می‌شود', 'ok');
    } catch (e) { console.error(e); G.toast(G.GitHub.explain(e), 'err'); }
    btn.disabled = false; if (restore) btn.innerHTML = restore; pubState();
  }
  function chrome() {
    $('#admName').textContent = DATA.settings.name; const l = G.src(DATA.settings.logo), el = $('#admLogo');
    el.style.backgroundImage = l ? `url("${l}")` : ''; el.textContent = l ? '' : (DATA.settings.name || 'گ').trim().charAt(0);
  }
  window.addEventListener('beforeunload', e => { if (ST.saving) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- راه‌اندازی ---------- */
  async function init() {
    G.fillIcons();
    const ti = () => { $('#btnTheme').innerHTML = G.icon(G.theme() === 'dark' ? 'sun' : 'moon'); }; ti();
    $('#btnTheme').onclick = () => { G.toggleTheme(); ti(); };
    try { const r = await G.Store.load(); DATA = r.data; MODE = r.mode; } catch (e) { DATA = G.normalize(null); MODE = 'published'; }
    $('#admNav').innerHTML = TABS.map(t => `<button data-tab="${t[0]}">${G.icon(t[2], 18)}<span>${t[1]}</span></button>`).join('');
    $('#admNav').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { ST.tab = b.dataset.tab; render(); } };
    G.applySettings(DATA.settings); chrome(); setSave('idle'); pubState(); $('#btnPub').onclick = e => publishNow(e.currentTarget); render();
  }
  function render() {
    $$('#admNav button').forEach(b => b.classList.toggle('on', b.dataset.tab === ST.tab));
    $('#tabTitle').textContent = TABS.find(t => t[0] === ST.tab)[1];
    ({ images: renderImages, albums: renderAlbums, settings: renderSettings, about: renderAbout, publish: renderPublish })[ST.tab]();
  }

  /* ================= تصاویر ================= */
  function renderImages() {
    $('#panel').innerHTML = `
    <div class="dropzone" id="dz" tabindex="0">${G.icon('upload', 36)}<h3>تصاویر را اینجا رها کنید</h3><p>یا کلیک کنید و چند تصویر را هم‌زمان انتخاب کنید</p><input type="file" id="file" accept="image/*" multiple hidden></div>
    <div id="staging"></div>
    <div class="card-box toolbar-admin">
      <input class="input" id="aq" type="search" placeholder="جستجو در عنوان و توضیحات…" value="${esc(ST.q)}">
      <select class="select" id="acat">${catOpts(ST.cat, 'همه دسته‌ها')}</select>
      <select class="select" id="aalb">${albOpts(ST.album, 'همه آلبوم‌ها')}<option value="__none" ${ST.album === '__none' ? 'selected' : ''}>بدون آلبوم</option></select>
      <div class="seg" id="layoutSeg" title="حالت چیدمان در صفحه عمومی"><button data-l="masonry">Masonry</button><button data-l="grid">Grid</button></div>
    </div>
    <div class="bulk" id="bulk"></div>
    <div class="lib" id="lib"></div>`;
    const dz = $('#dz'), file = $('#file');
    dz.onclick = () => file.click(); dz.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } };
    file.onchange = () => { addFiles(file.files); file.value = ''; };
    ['dragenter', 'dragover'].forEach(n => dz.addEventListener(n, e => { e.preventDefault(); dz.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(n => dz.addEventListener(n, e => { e.preventDefault(); dz.classList.remove('over'); }));
    dz.addEventListener('drop', e => { if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
    $('#aq').oninput = G.debounce(e => { ST.q = e.target.value; drawLib(); }, 200);
    $('#acat').onchange = e => { ST.cat = e.target.value; drawLib(); };
    $('#aalb').onchange = e => { ST.album = e.target.value; drawLib(); };
    const seg = () => $$('#layoutSeg button').forEach(b => b.classList.toggle('on', b.dataset.l === DATA.settings.layout));
    seg(); $('#layoutSeg').onclick = e => { const b = e.target.closest('[data-l]'); if (!b) return; DATA.settings.layout = b.dataset.l; seg(); touch(); G.toast('حالت چیدمان: ' + (b.dataset.l === 'grid' ? 'Grid' : 'Masonry'), 'ok'); };
    bindLib(); drawStaging(); drawLib();
  }
  function visible() {
    const q = G.norm(ST.q);
    return DATA.images.filter(i => (!ST.cat || i.category === ST.cat) && (!ST.album || (ST.album === '__none' ? !i.album : i.album === ST.album)) && (!q || G.norm(i.title + ' ' + i.desc).includes(q)));
  }
  /* --- آپلود و پیش‌نمایش --- */
  async function addFiles(files) {
    files = [...files].filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|svg|avif)$/i.test(f.name));
    if (!files.length) { G.toast('فایل تصویری انتخاب نشد'); return; }
    const dz = $('#dz'); dz.classList.add('busy');
    for (const f of files) {
      try {
        const p = await G.processFile(f);
        ST.staged.push({ k: G.uid('s'), file: f, url: URL.createObjectURL(f), title: f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), desc: '', category: ST.cat || '', album: ST.album && ST.album !== '__none' ? ST.album : '', cover: false, w: p.w, h: p.h, thumb: p.thumb });
      } catch (e) { console.warn(e); G.toast('خواندن «' + f.name + '» ممکن نشد', 'err'); }
      drawStaging();
    }
    dz.classList.remove('busy');
  }
  function drawStaging() {
    const el = $('#staging'); if (!el) return; const n = ST.staged.length;
    if (!n) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="card-box"><div class="stage-head"><h3>پیش‌نمایش پیش از ثبت (${fa(n)} تصویر)</h3>
      <label class="chk-line"><input type="checkbox" id="sOpt" ${ST.optimize === false ? '' : 'checked'}> بهینه‌سازی اندازه (حداکثر ۲۵۶۰ پیکسل)</label><div class="stage-common"><select id="sC" class="select sm"><option value="">دسته‌بندی برای همه…</option>${catOpts('')}</select><select id="sA" class="select sm"><option value="">آلبوم برای همه…</option>${albOpts('')}</select></div></div>
      <div class="stage-grid">${ST.staged.map(s => `<div class="scard" data-k="${s.k}"><button class="x" data-rm title="حذف از لیست">×</button><img src="${s.url}" alt="">
        <input class="input sTitle" value="${esc(s.title)}" placeholder="عنوان"><textarea class="input sDesc" rows="2" placeholder="توضیحات">${esc(s.desc)}</textarea>
        <div class="row2"><select class="select sCat"><option value="">بدون دسته</option>${catOpts(s.category)}</select><select class="select sAlb"><option value="">بدون آلبوم</option>${albOpts(s.album)}</select></div>
        <label class="chk-line"><input type="checkbox" class="sCov" ${s.cover ? 'checked' : ''} ${s.album ? '' : 'disabled'}> جلد آلبوم</label></div>`).join('')}</div>
      <div class="modal-actions"><button class="btn" id="sCancel">لغو همه</button><button class="btn primary" id="sSave">ثبت ${fa(n)} تصویر</button></div></div>`;
    const item = t => { const c = t.closest('.scard'); return c && ST.staged.find(s => s.k === c.dataset.k); };
    el.oninput = e => { const s = item(e.target); if (!s) return; if (e.target.classList.contains('sTitle')) s.title = e.target.value; if (e.target.classList.contains('sDesc')) s.desc = e.target.value; };
    el.onchange = e => {
      const t = e.target, s = item(t); if (!s) return;
      if (t.classList.contains('sCat')) s.category = t.value;
      if (t.classList.contains('sAlb')) { s.album = t.value; const cv = t.closest('.scard').querySelector('.sCov'); cv.disabled = !t.value; if (!t.value) { cv.checked = false; s.cover = false; } }
      if (t.classList.contains('sCov')) s.cover = t.checked;
    };
    el.onclick = e => { const b = e.target.closest('[data-rm]'); if (!b) return; const s = item(b); URL.revokeObjectURL(s.url); ST.staged = ST.staged.filter(x => x !== s); drawStaging(); };
    $('#sC').onchange = e => { if (e.target.value) { ST.staged.forEach(s => s.category = e.target.value); drawStaging(); } };
    $('#sA').onchange = e => { if (e.target.value) { ST.staged.forEach(s => { s.album = e.target.value; }); drawStaging(); } };
    $('#sCancel').onclick = () => { ST.staged.forEach(s => URL.revokeObjectURL(s.url)); ST.staged = []; drawStaging(); };
    $('#sOpt').onchange = e => { ST.optimize = e.target.checked; };
    $('#sSave').onclick = commitStaged;
  }
  async function commitStaged() {
    const btn = $('#sSave'); btn.disabled = true; btn.textContent = 'در حال ذخیره…';
    try {
      for (const s of ST.staged) {
        let blob = s.file; if (ST.optimize !== false && Math.max(s.w, s.h) > 2560 && !/svg|gif/.test(s.file.type)) { try { blob = await G.resizeImage(s.file, 2560, 'image/jpeg', 0.9); } catch (e) { blob = s.file; } }
        const src = await G.Store.addBlob(blob), th = s.thumb ? await G.Store.addBlob(s.thumb) : src, id = G.uid('img');
        DATA.images.push({ id, src, thumb: th, title: s.title.trim() || 'بدون عنوان', desc: s.desc.trim(), category: s.category, album: s.album, date: new Date(s.file.lastModified || Date.now()).toISOString(), featured: false, w: s.w, h: s.h, fileName: s.file.name });
        if (s.cover && s.album) { const a = albumObj(s.album); if (a) a.coverId = id; }
        URL.revokeObjectURL(s.url);
      }
      const n = ST.staged.length; ST.staged = []; touch(); G.toast(`${fa(n)} تصویر اضافه شد`, 'ok'); drawStaging(); drawLib();
    } catch (e) { console.error(e); G.toast('ثبت تصاویر با خطا مواجه شد', 'err'); btn.disabled = false; btn.textContent = 'تلاش دوباره'; }
  }
  /* --- کتابخانه --- */
  function drawLib() {
    const v = visible(), lib = $('#lib');
    if (!v.length) { lib.innerHTML = `<div class="empty-box" style="grid-column:1/-1">${DATA.images.length ? 'موردی با این فیلتر پیدا نشد.' : 'هنوز تصویری ندارید. از بخش بالا تصاویر را اضافه کنید.'}</div>`; drawBulk(); return; }
    lib.innerHTML = v.map(im => `<div class="lcard ${ST.sel.has(im.id) ? 'sel' : ''}" draggable="true" data-id="${esc(im.id)}">
      <label class="chk"><input type="checkbox" ${ST.sel.has(im.id) ? 'checked' : ''} aria-label="انتخاب"></label>
      ${im.featured ? `<span class="star-badge" title="منتخب">${G.icon('star', 13)}</span>` : ''}${isCover(im) ? '<span class="cover-badge">جلد آلبوم</span>' : ''}
      <img src="${thumb(im)}" alt="" loading="lazy" draggable="false">
      <div class="lmeta"><b>${esc(im.title)}</b><small>${esc([catName(im.category), albumName(im.album)].filter(Boolean).join(' • ') || 'بدون دسته/آلبوم')}</small></div>
      <div class="lacts"><button data-act="earlier" title="جلوتر ببر">${G.icon('chevR', 16)}</button><button data-act="later" title="عقب‌تر ببر">${G.icon('chevL', 16)}</button>
      <button data-act="feat" class="${im.featured ? 'on' : ''}" title="منتخب">${G.icon('star', 16)}</button><button data-act="edit" title="ویرایش">${G.icon('edit', 16)}</button><button data-act="del" class="d" title="حذف">${G.icon('trash', 16)}</button></div></div>`).join('');
    drawBulk();
  }
  function bindLib() {
    const lib = $('#lib'); let dragId = null;
    lib.addEventListener('click', e => {
      const card = e.target.closest('.lcard'); if (!card) return; const id = card.dataset.id, b = e.target.closest('[data-act]');
      if (!b) return; const act = b.dataset.act, im = img(id);
      if (act === 'edit') editImage(id);
      else if (act === 'feat') { im.featured = !im.featured; touch(); drawLib(); }
      else if (act === 'del') delImages([id]);
      else move(id, act === 'earlier' ? -1 : 1);
    });
    lib.addEventListener('change', e => {
      const card = e.target.closest('.lcard'); if (!card || e.target.type !== 'checkbox') return;
      e.target.checked ? ST.sel.add(card.dataset.id) : ST.sel.delete(card.dataset.id); card.classList.toggle('sel', e.target.checked); drawBulk();
    });
    lib.addEventListener('dragstart', e => { const c = e.target.closest('.lcard'); if (!c) return; dragId = c.dataset.id; c.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
    lib.addEventListener('dragover', e => { const c = e.target.closest('.lcard'); if (!c || !dragId) return; e.preventDefault(); $$('.lcard.over', lib).forEach(x => x !== c && x.classList.remove('over')); c.classList.add('over'); });
    lib.addEventListener('drop', e => {
      const c = e.target.closest('.lcard'); if (!c || !dragId) return; e.preventDefault();
      const from = DATA.images.findIndex(i => i.id === dragId), to = DATA.images.findIndex(i => i.id === c.dataset.id);
      if (from < 0 || to < 0 || from === to) return;
      const [m] = DATA.images.splice(from, 1); DATA.images.splice(DATA.images.findIndex(i => i.id === c.dataset.id) + (from < to ? 1 : 0), 0, m);
      touch(); drawLib();
    });
    lib.addEventListener('dragend', () => { dragId = null; $$('.lcard.drag,.lcard.over', lib).forEach(x => x.classList.remove('drag', 'over')); });
  }
  function move(id, dir) {
    const v = visible(), i = v.findIndex(x => x.id === id), n = v[i + dir]; if (!n) return;
    const a = DATA.images.findIndex(x => x.id === id), b = DATA.images.findIndex(x => x.id === n.id);
    [DATA.images[a], DATA.images[b]] = [DATA.images[b], DATA.images[a]]; touch(); drawLib();
  }
  async function delImages(ids) {
    if (!(await G.confirm(ids.length > 1 ? `${fa(ids.length)} تصویر برای همیشه حذف شوند؟` : 'این تصویر برای همیشه حذف شود؟', 'حذف'))) return;
    const set = new Set(ids); DATA.images = DATA.images.filter(i => !set.has(i.id));
    DATA.albums.forEach(a => { if (set.has(a.coverId)) a.coverId = ''; }); ids.forEach(i => ST.sel.delete(i));
    touch(); drawLib(); G.toast('حذف شد', 'ok');
  }
  function drawBulk() {
    const b = $('#bulk'); if (!b) return; const n = ST.sel.size, v = visible(), all = v.length && v.every(i => ST.sel.has(i.id));
    b.innerHTML = `<label class="chk-line"><input type="checkbox" id="selAll" ${all ? 'checked' : ''}> انتخاب همه (${fa(v.length)})</label>` + (n ? `<span class="bulk-n">${fa(n)} انتخاب‌شده</span>
      <select class="select sm" id="bMove"><option value="">انتقال به آلبوم…</option><option value="__none">بدون آلبوم</option>${albOpts('')}</select>
      <select class="select sm" id="bCat"><option value="">تغییر دسته‌بندی…</option><option value="__none">بدون دسته</option>${catOpts('')}</select>
      <button class="btn sm" id="bFeat">منتخب کن</button><button class="btn sm" id="bUnfeat">حذف از منتخب</button><button class="btn sm danger" id="bDel">حذف</button><button class="btn sm ghost" id="bClear">لغو انتخاب</button>` : '');
    $('#selAll').onchange = e => { v.forEach(i => e.target.checked ? ST.sel.add(i.id) : ST.sel.delete(i.id)); drawLib(); };
    if (!n) return;
    const sel = () => DATA.images.filter(i => ST.sel.has(i.id));
    $('#bMove').onchange = e => { if (!e.target.value) return; const t = e.target.value === '__none' ? '' : e.target.value; sel().forEach(i => setAlbum(i, t)); touch(); drawLib(); G.toast('انتقال انجام شد', 'ok'); };
    $('#bCat').onchange = e => { if (!e.target.value) return; const t = e.target.value === '__none' ? '' : e.target.value; sel().forEach(i => { i.category = t; }); touch(); drawLib(); G.toast('دسته‌بندی تغییر کرد', 'ok'); };
    $('#bFeat').onclick = () => { sel().forEach(i => { i.featured = true; }); touch(); drawLib(); };
    $('#bUnfeat').onclick = () => { sel().forEach(i => { i.featured = false; }); touch(); drawLib(); };
    $('#bDel').onclick = () => delImages([...ST.sel]); $('#bClear').onclick = () => { ST.sel.clear(); drawLib(); };
  }
  function editImage(id) {
    const im = img(id);
    const m = G.modal(`<h3>ویرایش تصویر</h3><div class="edit-grid"><img class="edit-prev" src="${thumb(im)}" alt=""><div class="fields">
      <label>عنوان<input class="input" id="eT" value="${esc(im.title)}"></label>
      <label>توضیحات<textarea class="input" id="eD" rows="3">${esc(im.desc)}</textarea></label>
      <div class="row2"><label>دسته‌بندی<select class="select" id="eC" style="width:100%"><option value="">بدون دسته</option>${catOpts(im.category)}</select></label>
      <label>آلبوم<select class="select" id="eA" style="width:100%"><option value="">بدون آلبوم</option>${albOpts(im.album)}</select></label></div>
      <label>تاریخ<input type="date" class="input" id="eDt" value="${esc(String(im.date).slice(0, 10))}"></label>
      <label class="chk-line"><input type="checkbox" id="eF" ${im.featured ? 'checked' : ''}> تصویر منتخب</label>
      <label class="chk-line"><input type="checkbox" id="eCov" ${isCover(im) ? 'checked' : ''} ${im.album ? '' : 'disabled'}> جلد آلبوم</label></div></div>
      <div class="modal-actions"><button class="btn danger" id="eDel">حذف</button><span style="flex:1"></span><button class="btn" data-close>انصراف</button><button class="btn primary" id="eSave">ذخیره</button></div>`, { cls: 'wide' });
    const q = s => m.el.querySelector(s);
    q('#eA').onchange = e => { q('#eCov').disabled = !e.target.value; if (!e.target.value) q('#eCov').checked = false; };
    q('#eDel').onclick = async () => { m.close(); await delImages([id]); };
    q('#eSave').onclick = () => {
      im.title = q('#eT').value.trim() || 'بدون عنوان'; im.desc = q('#eD').value.trim(); im.category = q('#eC').value;
      if (q('#eA').value !== im.album) setAlbum(im, q('#eA').value);
      const d = q('#eDt').value; if (d) im.date = new Date(d + 'T12:00:00').toISOString();
      im.featured = q('#eF').checked; const a = albumObj(im.album);
      if (a) { if (q('#eCov').checked) a.coverId = im.id; else if (a.coverId === im.id) a.coverId = ''; }
      touch(); m.close(); drawLib(); G.toast('ذخیره شد', 'ok');
    };
  }

  /* ================= آلبوم‌ها ================= */
  function renderAlbums() {
    $('#panel').innerHTML = `<div class="card-box"><form id="albForm" class="inline-form"><input class="input" id="albName" placeholder="نام آلبوم جدید…" required><button class="btn primary">${G.icon('plus', 16)} ساخت آلبوم</button></form></div><div class="album-admin" id="albList"></div>`;
    $('#albForm').onsubmit = e => {
      e.preventDefault(); const n = $('#albName').value.trim(); if (!n) return;
      DATA.albums.push({ id: G.uid('alb'), name: n, coverId: '' }); $('#albName').value = ''; touch(); drawAlbums(); G.toast('آلبوم ساخته شد', 'ok');
    };
    $('#albList').onclick = async e => {
      const b = e.target.closest('[data-a]'); if (!b) return; const id = b.closest('.acard').dataset.id, a = albumObj(id);
      if (b.dataset.a === 'rename') { const n = await G.prompt('نام جدید آلبوم', a.name); if (n) { a.name = n; touch(); drawAlbums(); } }
      else if (b.dataset.a === 'cover') coverModal(id);
      else if (b.dataset.a === 'move') moveModal(id);
      else if (b.dataset.a === 'view') { ST.album = id; ST.tab = 'images'; render(); }
      else if (b.dataset.a === 'del') {
        if (await G.confirm(`آلبوم «${a.name}» حذف شود؟ تصاویر آن حذف نمی‌شوند و «بدون آلبوم» می‌شوند.`, 'حذف آلبوم')) {
          DATA.images.forEach(i => { if (i.album === id) i.album = ''; }); DATA.albums = DATA.albums.filter(x => x.id !== id); if (ST.album === id) ST.album = ''; touch(); drawAlbums();
        }
      }
    };
    drawAlbums();
  }
  function drawAlbums() {
    const L = $('#albList');
    if (!DATA.albums.length) { L.innerHTML = '<div class="empty-box" style="grid-column:1/-1">هنوز آلبومی ندارید. یک نام وارد کنید و آلبوم بسازید.</div>'; return; }
    L.innerHTML = DATA.albums.map(a => {
      const imgs = DATA.images.filter(i => i.album === a.id), cov = img(a.coverId) || imgs[0];
      return `<div class="acard" data-id="${esc(a.id)}"><div class="acover">${cov ? `<img src="${thumb(cov)}" alt="">` : G.icon('image', 36)}</div><div class="abody"><h3>${esc(a.name)}</h3><small>${fa(imgs.length)} تصویر</small>
      <div class="aacts"><button class="btn sm" data-a="rename">نام</button><button class="btn sm" data-a="cover">تصویر جلد</button><button class="btn sm" data-a="move">انتقال تصاویر</button><button class="btn sm" data-a="view">نمایش تصاویر</button><button class="btn sm danger" data-a="del">حذف</button></div></div></div>`;
    }).join('');
  }
  function coverModal(id) {
    const a = albumObj(id), imgs = DATA.images.filter(i => i.album === id);
    if (!imgs.length) { G.toast('ابتدا تصویری به این آلبوم اضافه کنید'); return; }
    const m = G.modal(`<h3>انتخاب جلد «${esc(a.name)}»</h3><div class="pick-grid">${imgs.map(i => `<button class="pick" data-id="${esc(i.id)}"><img src="${thumb(i)}" alt=""><span>${esc(i.title)}</span></button>`).join('')}</div><div class="modal-actions"><button class="btn" id="cAuto">خودکار (اولین تصویر)</button><button class="btn" data-close>بستن</button></div>`, { cls: 'wide' });
    m.el.onclick = e => { const b = e.target.closest('.pick'); if (!b) return; a.coverId = b.dataset.id; touch(); drawAlbums(); m.close(); G.toast('جلد تغییر کرد', 'ok'); };
    m.el.querySelector('#cAuto').onclick = () => { a.coverId = ''; touch(); drawAlbums(); m.close(); };
  }
  function moveModal(id) {
    const a = albumObj(id), imgs = DATA.images.filter(i => i.album === id);
    if (!imgs.length) { G.toast('این آلبوم تصویری ندارد'); return; }
    const m = G.modal(`<h3>انتقال تصاویر «${esc(a.name)}»</h3><div class="pick-grid">${imgs.map(i => `<label class="pick"><input type="checkbox" value="${esc(i.id)}" checked><img src="${thumb(i)}" alt=""><span>${esc(i.title)}</span></label>`).join('')}</div>
      <label>انتقال به<select class="select" id="mDest" style="width:100%"><option value="">بدون آلبوم</option>${DATA.albums.filter(x => x.id !== id).map(x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label>
      <div class="modal-actions"><button class="btn" data-close>انصراف</button><button class="btn primary" id="mGo">انتقال</button></div>`, { cls: 'wide' });
    m.el.querySelector('#mGo').onclick = () => {
      const ids = new Set([...m.el.querySelectorAll('input:checked')].map(x => x.value)), dest = m.el.querySelector('#mDest').value;
      imgs.filter(i => ids.has(i.id)).forEach(i => setAlbum(i, dest)); touch(); drawAlbums(); m.close(); G.toast(`${fa(ids.size)} تصویر منتقل شد`, 'ok');
    };
  }

  /* ================= تنظیمات ================= */
  async function uploadInto(file, max, mime, setter) {
    try { const blob = await G.resizeImage(file, max, mime); const ref = await G.Store.addBlob(blob); setter(ref); touch(); render(); } catch (e) { G.toast('بارگذاری تصویر انجام نشد', 'err'); }
  }
  function imgField(label, ref, id) {
    return `<div class="upl"><div class="pv" style="background-image:${ref ? `url('${G.src(ref)}')` : 'none'}"></div><div><div>${label}</div><div class="btn-row" style="margin-top:.3rem"><button class="btn sm" data-pick="${id}">انتخاب تصویر</button>${ref ? `<button class="btn sm ghost" data-clear="${id}">حذف</button>` : ''}</div></div><input type="file" accept="image/*" id="f_${id}" hidden></div>`;
  }
  function renderSettings() {
    const s = DATA.settings;
    $('#panel').innerHTML = `<div class="form-grid"><div class="card-box fields"><h3>مشخصات گالری</h3>
      <label>نام گالری<input class="input" id="sName" value="${esc(s.name)}"></label>
      <label>توضیحات گالری<textarea class="input" id="sDesc" rows="3">${esc(s.description)}</textarea></label>
      ${imgField('لوگو', s.logo, 'logo')}${imgField('تصویر بنر / پس‌زمینه', s.banner, 'banner')}</div>
      <div class="card-box fields"><h3>ظاهر و نمایش</h3>
      <div><label>رنگ اصلی سایت</label><div class="swatches">${ACCENTS.map(c => `<button data-c="${c}" style="background:${c}" title="${c}"></button>`).join('')}<input type="color" id="sAccent" value="${esc(s.accent)}"></div></div>
      <label>تعداد تصاویر در هر ردیف: <b id="colOut">${fa(s.columns)}</b><input type="range" id="sCols" min="2" max="6" value="${s.columns}" style="width:100%"></label>
      <label>حالت نمایش<select class="select" id="sLayout" style="width:100%"><option value="masonry" ${s.layout === 'masonry' ? 'selected' : ''}>Masonry (چیدمان نامنظم)</option><option value="grid" ${s.layout === 'grid' ? 'selected' : ''}>Grid (شبکه‌ای منظم)</option></select></label>
      <label>تعداد تصویر در هر بار نمایش<select class="select" id="sPage" style="width:100%">${[12, 24, 36, 48, 96].map(n => `<option value="${n}" ${+s.pageSize === n ? 'selected' : ''}>${fa(n)}</option>`).join('')}</select></label></div>
      <div class="card-box"><h3>مدیریت دسته‌بندی‌ها</h3><div id="catList"></div><div class="cat-row"><input class="input" id="newCat" placeholder="دسته‌بندی جدید…"><button class="btn primary" id="addCat">${G.icon('plus', 16)} افزودن</button></div></div></div>`;
    const bind = (sel, key) => { $(sel).oninput = e => { s[key] = e.target.value; touch(); }; };
    bind('#sName', 'name'); bind('#sDesc', 'description');
    $('#sCols').oninput = e => { s.columns = +e.target.value; $('#colOut').textContent = fa(s.columns); touch(); };
    $('#sLayout').onchange = e => { s.layout = e.target.value; touch(); }; $('#sPage').onchange = e => { s.pageSize = +e.target.value; touch(); };
    $('#sAccent').oninput = e => { s.accent = e.target.value; touch(); };
    $$('.swatches [data-c]').forEach(b => b.onclick = () => { s.accent = b.dataset.c; $('#sAccent').value = b.dataset.c; touch(); });
    $$('[data-pick]').forEach(b => b.onclick = () => $('#f_' + b.dataset.pick).click());
    $$('[data-clear]').forEach(b => b.onclick = () => { s[b.dataset.clear] = ''; touch(); render(); });
    $('#f_logo').onchange = e => e.target.files[0] && uploadInto(e.target.files[0], 512, 'image/png', r => { s.logo = r; });
    $('#f_banner').onchange = e => e.target.files[0] && uploadInto(e.target.files[0], 2000, 'image/jpeg', r => { s.banner = r; });
    drawCats();
    const add = () => { const n = $('#newCat').value.trim(); if (!n) return; DATA.categories.push({ id: G.uid('cat'), name: n }); $('#newCat').value = ''; touch(); drawCats(); };
    $('#addCat').onclick = add; $('#newCat').onkeydown = e => { if (e.key === 'Enter') add(); };
  }
  function drawCats() {
    const L = $('#catList'); if (!DATA.categories.length) { L.innerHTML = '<div class="empty-box" style="margin-bottom:.6rem">هنوز دسته‌بندی‌ای ندارید.</div>'; return; }
    L.innerHTML = DATA.categories.map(c => `<div class="cat-row" data-id="${esc(c.id)}"><input class="input" value="${esc(c.name)}"><button class="btn sm danger" data-del>حذف</button></div>`).join('');
    L.onchange = e => { const r = e.target.closest('.cat-row'); const c = DATA.categories.find(x => x.id === r.dataset.id); const v = e.target.value.trim(); if (c && v) { c.name = v; touch(); } };
    L.onclick = async e => {
      const b = e.target.closest('[data-del]'); if (!b) return; const id = b.closest('.cat-row').dataset.id;
      if (await G.confirm('این دسته‌بندی حذف شود؟ تصاویر آن «بدون دسته» می‌شوند.', 'حذف')) { DATA.images.forEach(i => { if (i.category === id) i.category = ''; }); DATA.categories = DATA.categories.filter(c => c.id !== id); touch(); drawCats(); }
    };
  }

  /* ================= درباره ما ================= */
  function renderAbout() {
    const a = DATA.about;
    $('#panel').innerHTML = `<div class="form-grid"><div class="card-box fields"><h3>معرفی صاحب گالری</h3>
      <label>عنوان<input class="input" id="aTitle" value="${esc(a.title)}"></label>
      <label>متن معرفی<textarea class="input" id="aText" rows="7">${esc(a.text)}</textarea></label>
      <label>ایمیل<input class="input" id="aMail" type="email" dir="ltr" value="${esc(a.email)}"></label>
      ${imgField('عکس', a.photo, 'photo')}</div>
      <div class="card-box"><h3>شبکه‌های اجتماعی</h3><div id="socList"></div><button class="btn" id="addSoc">${G.icon('plus', 16)} افزودن لینک</button></div></div>`;
    [['#aTitle', 'title'], ['#aText', 'text'], ['#aMail', 'email']].forEach(([s, k]) => $(s).oninput = e => { a[k] = e.target.value; touch(); });
    $('[data-pick]').onclick = () => $('#f_photo').click();
    const clr = $('[data-clear]'); if (clr) clr.onclick = () => { a.photo = ''; touch(); render(); };
    $('#f_photo').onchange = e => e.target.files[0] && uploadInto(e.target.files[0], 800, 'image/jpeg', r => { a.photo = r; });
    const draw = () => {
      $('#socList').innerHTML = a.socials.map((s, i) => `<div class="cat-row" data-i="${i}"><input class="input" data-k="label" placeholder="عنوان (مثلاً اینستاگرام)" value="${esc(s.label)}"><input class="input" data-k="url" dir="ltr" placeholder="https://…" value="${esc(s.url)}"><button class="btn sm danger" data-del>×</button></div>`).join('');
    };
    $('#socList').oninput = e => { const r = e.target.closest('.cat-row'); if (r && e.target.dataset.k) { a.socials[+r.dataset.i][e.target.dataset.k] = e.target.value; touch(); } };
    $('#socList').onclick = e => { const b = e.target.closest('[data-del]'); if (b) { a.socials.splice(+b.closest('.cat-row').dataset.i, 1); touch(); draw(); } };
    $('#addSoc').onclick = () => { a.socials.push({ label: '', url: '' }); touch(); draw(); };
    draw();
  }

  /* ================= انتشار و خروجی ================= */
  async function renderPublish() {
    const hasSample = DATA.images.some(i => i.sample) || DATA.albums.some(a => a.sample) || DATA.categories.some(c => c.sample);
    const gh = G.GitHub.getCfg();
    $('#panel').innerHTML = `<div class="stat-cards">${[[DATA.images.length, 'تصویر'], [DATA.albums.length, 'آلبوم'], [DATA.categories.length, 'دسته‌بندی'], [DATA.images.filter(i => i.featured).length, 'منتخب']].map(x => `<div class="stat-c"><b>${fa(x[0])}</b><span>${x[1]}</span></div>`).join('')}<div class="stat-c"><b id="usage">…</b><span>فضای مصرفی مرورگر</span></div></div>
      <div class="card-box"><h3>انتشار مستقیم روی GitHub (از همین پنل)</h3>
      <div class="note" style="margin-bottom:.8rem">یک‌بار اتصال را تنظیم کنید؛ بعد از آن با یک کلیک همه تصاویر و تغییرات در مخزن شما commit می‌شود و GitHub Pages خودش سایت را به‌روز می‌کند.</div>
      <div class="form-grid"><label>نام کاربری GitHub<input class="input" id="ghOwner" dir="ltr" value="${esc(gh.owner)}" placeholder="username"></label><label>نام مخزن<input class="input" id="ghRepo" dir="ltr" value="${esc(gh.repo)}" placeholder="my-gallery"></label>
      <label>شاخه (Branch)<input class="input" id="ghBranch" dir="ltr" value="${esc(gh.branch)}" placeholder="main"></label><label>توکن دسترسی (Personal Access Token)<input class="input" id="ghToken" type="password" dir="ltr" value="${esc(gh.token)}" placeholder="github_pat_…" autocomplete="off"></label></div>
      <ol class="steps" style="margin:.9rem 0"><li>در GitHub به <b>Settings ‹ Developer settings ‹ Personal access tokens ‹ Fine-grained tokens</b> بروید و Generate new token بزنید.</li><li>در Repository access فقط همین مخزن را انتخاب کنید و در Permissions برای <b>Contents</b> گزینه <b>Read and write</b> را بدهید.</li><li>توکن را اینجا بچسبانید. توکن فقط در همین مرورگر ذخیره می‌شود و جایی ارسال نمی‌شود جز api.github.com.</li></ol>
      <div class="btn-row"><button class="btn" id="ghSave">ذخیره و آزمایش اتصال</button><button class="btn primary" id="ghPub">${G.icon('upload', 16)} انتشار روی سایت</button><button class="btn ghost" id="ghForget">فراموش کردن توکن</button></div></div>
      <div class="card-box"><h3>انتشار دستی با ZIP</h3>
      <div class="note" style="margin-bottom:.8rem">اگر نمی‌خواهید توکن وارد کنید، بسته را دانلود و در مخزن جایگزین کنید:</div>
      <ol class="steps"><li>روی <b>دانلود بسته انتشار</b> بزنید تا فایل ZIP ساخته شود.</li><li>ZIP را باز کنید؛ پوشه‌های <b>data</b> و <b>assets/images</b> را در ریشه مخزن GitHub جایگزین کنید (پوشه قبلی را کامل عوض کنید تا فایل‌های نمونه و قدیمی نمانند).</li><li>تغییرات را <b>commit</b> و <b>push</b> کنید؛ بعد از چند دقیقه سایت به‌روز می‌شود.</li></ol>
      <div class="btn-row" style="margin-top:1rem"><button class="btn primary" id="pkg">${G.icon('download', 16)} دانلود بسته انتشار (ZIP)</button></div></div>
      <div class="card-box"><h3>مدیریت داده‌ها</h3><div class="btn-row">
      ${hasSample ? '<button class="btn" id="rmSample">حذف داده‌های نمونه</button>' : ''}
      <button class="btn" id="clearAll">حذف همه تصاویر و آلبوم‌ها</button>
      <button class="btn danger" id="resetLocal">بازگشت به نسخه منتشرشده (حذف پیش‌نویس محلی)</button></div></div>`;
    if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(e => { const u = $('#usage'); if (u) u.textContent = fa((e.usage / 1048576).toFixed(1)) + ' MB'; }).catch(() => {}); else $('#usage').textContent = '—';
    const readGh = () => ({ owner: $('#ghOwner').value.trim(), repo: $('#ghRepo').value.trim(), branch: $('#ghBranch').value.trim() || 'main', token: $('#ghToken').value.trim() });
    $('#ghSave').onclick = async e => {
      const b = e.currentTarget, c = readGh(); G.GitHub.setCfg(c);
      if (!c.owner || !c.repo || !c.token) { G.toast('نام کاربری، مخزن و توکن را وارد کنید'); return; }
      b.disabled = true;
      try { const n = await G.GitHub.test(c); G.toast('اتصال برقرار شد: ' + n, 'ok'); } catch (err) { G.toast(G.GitHub.explain(err), 'err'); }
      b.disabled = false;
    };
    $('#ghPub').onclick = e => { G.GitHub.setCfg(readGh()); publishNow(e.currentTarget, G.icon('upload', 16) + ' انتشار روی سایت'); };
    $('#ghForget').onclick = () => { G.GitHub.forgetToken(); $('#ghToken').value = ''; G.toast('توکن از این مرورگر پاک شد', 'ok'); };
    $('#pkg').onclick = async () => {
      const b = $('#pkg'); b.disabled = true;
      try {
        await G.Store.save(DATA);
        const blob = await G.Store.buildPackage(DATA, (i, n) => { b.textContent = `در حال آماده‌سازی… ${fa(i)} از ${fa(n)}`; });
        G.download(blob, 'gallery-publish.zip'); G.toast('بسته انتشار دانلود شد', 'ok');
      } catch (e) { console.error(e); G.toast('ساخت بسته با خطا مواجه شد', 'err'); }
      b.disabled = false; b.innerHTML = G.icon('download', 16) + ' دانلود بسته انتشار (ZIP)';
    };
    const rs = $('#rmSample');
    if (rs) rs.onclick = async () => {
      if (!(await G.confirm('تصاویر، آلبوم‌ها و دسته‌بندی‌های نمونه حذف شوند؟', 'حذف نمونه‌ها'))) return;
      DATA.images = DATA.images.filter(i => !i.sample);
      DATA.albums = DATA.albums.filter(a => !a.sample || DATA.images.some(i => i.album === a.id));
      DATA.categories = DATA.categories.filter(c => !c.sample || DATA.images.some(i => i.category === c.id));
      DATA.albums.forEach(a => { if (!img(a.coverId)) a.coverId = ''; }); ST.sel.clear(); ST.cat = ST.album = '';
      touch(); G.toast('داده‌های نمونه حذف شد', 'ok'); render();
    };
    $('#clearAll').onclick = async () => {
      if (!(await G.confirm('همه تصاویر، آلبوم‌ها و دسته‌بندی‌ها حذف شوند؟ (تنظیمات و درباره ما باقی می‌ماند)', 'حذف همه'))) return;
      DATA.images = []; DATA.albums = []; DATA.categories = []; ST.sel.clear(); ST.cat = ST.album = ''; touch(); G.toast('گالری خالی شد', 'ok'); render();
    };
    $('#resetLocal').onclick = async () => {
      if (!(await G.confirm('پیش‌نویس محلی و تصاویر بارگذاری‌شده در این مرورگر پاک می‌شود و نسخه منتشرشده بارگذاری می‌شود. ادامه می‌دهید؟', 'پاک‌سازی'))) return;
      try { await G.Store.resetLocal(); const r = await G.Store.load({ preferPublished: true }); DATA = r.data; MODE = r.mode; ST.sel.clear(); ST.staged = []; ST.cat = ST.album = ''; G.applySettings(DATA.settings); chrome(); setSave('idle'); G.toast('بازگردانی شد', 'ok'); render(); }
      catch (e) { G.toast('بازگردانی انجام نشد', 'err'); }
    };
  }
  init();
})();
