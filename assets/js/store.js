/* ذخیره‌سازی: خواندن نسخه منتشرشده (data/gallery.json)، پیش‌نویس محلی (IndexedDB) و ساخت بسته انتشار */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  let dbp;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('IndexedDB unavailable'));
      const r = indexedDB.open('photo-gallery-db', 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('meta'); r.result.createObjectStore('blobs'); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(store, mode, fn) {
    const d = await open();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode), r = fn(t.objectStore(store));
      t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  }
  const db = {
    get: (s, k) => tx(s, 'readonly', o => o.get(k)), put: (s, k, v) => tx(s, 'readwrite', o => o.put(v, k)),
    del: (s, k) => tx(s, 'readwrite', o => o.delete(k)), keys: s => tx(s, 'readonly', o => o.getAllKeys()), clear: s => tx(s, 'readwrite', o => o.clear())
  };
  const urlCache = {};
  G.src = ref => !ref ? '' : ref.startsWith('local:') ? (urlCache[ref] || '') : ref;

  G.emptyData = () => ({
    version: 1,
    settings: { name: 'گالری من', description: 'مجموعه‌ای از لحظه‌های ماندگار', logo: '', banner: '', accent: '#12a594', columns: 4, layout: 'masonry', pageSize: 24 },
    about: { title: 'درباره من', text: '', photo: '', email: '', socials: [] },
    categories: [], albums: [], images: []
  });
  G.normalize = d => {
    const e = G.emptyData(); d = d || {};
    return {
      version: 1, settings: Object.assign(e.settings, d.settings || {}), about: Object.assign(e.about, d.about || {}),
      categories: d.categories || [], albums: d.albums || [],
      images: (d.images || []).map(im => Object.assign({ featured: false, desc: '', category: '', album: '', date: new Date().toISOString(), w: 4, h: 3 }, im, { thumb: im.thumb || im.src }))
    };
  };
  async function preload(data) {
    const refs = new Set([data.settings.logo, data.settings.banner, data.about.photo]);
    data.images.forEach(i => { refs.add(i.src); refs.add(i.thumb); });
    for (const ref of refs) {
      if (ref && ref.startsWith('local:') && !urlCache[ref]) {
        const b = await db.get('blobs', ref.slice(6));
        if (b) urlCache[ref] = URL.createObjectURL(b);
      }
    }
  }
  async function fetchPublished() {
    try { const r = await fetch('data/gallery.json', { cache: 'no-cache' }); if (!r.ok) throw 0; return await r.json(); }
    catch (e) { return window.GALLERY_DATA ? JSON.parse(JSON.stringify(window.GALLERY_DATA)) : null; }
  }
  async function gc(data) {
    const used = new Set(), add = r => { if (r && r.startsWith('local:')) used.add(r.slice(6)); };
    data.images.forEach(i => { add(i.src); add(i.thumb); }); add(data.settings.logo); add(data.settings.banner); add(data.about.photo);
    for (const k of await db.keys('blobs')) if (!used.has(k)) { await db.del('blobs', k); const u = urlCache['local:' + k]; if (u) { URL.revokeObjectURL(u); delete urlCache['local:' + k]; } }
  }
  async function blobOf(ref) {
    if (ref.startsWith('local:')) return db.get('blobs', ref.slice(6));
    const r = await fetch(ref); if (!r.ok) throw new Error('fetch ' + ref); return r.blob();
  }

  G.Store = {
    async hasLocal() { try { return !!(await db.get('meta', 'gallery')); } catch (e) { return false; } },
    async load({ preferPublished = false } = {}) {
      let data = null, mode = 'published';
      if (!preferPublished) { try { const l = await db.get('meta', 'gallery'); if (l) { data = l; mode = 'local'; } } catch (e) {} }
      if (!data) data = await fetchPublished();
      data = G.normalize(data);
      try { await preload(data); } catch (e) {}
      return { data, mode };
    },
    async save(data) { await db.put('meta', 'gallery', data); await gc(data); },
    async addBlob(blob) { const key = G.uid('b'); await db.put('blobs', key, blob); const ref = 'local:' + key; urlCache[ref] = URL.createObjectURL(blob); return ref; },
    async resetLocal() { await db.clear('meta'); await db.clear('blobs'); Object.keys(urlCache).forEach(k => { URL.revokeObjectURL(urlCache[k]); delete urlCache[k]; }); },
    /** ساخت بسته انتشار: data/gallery.json + data/gallery.js + assets/images/... */
    async buildPackage(data, onProgress) {
      const out = JSON.parse(JSON.stringify(data)), files = [], map = {};
      const pack = async (ref, nameFn) => {
        if (!ref) return ''; if (map[ref] !== undefined) return map[ref];
        let b; try { b = await blobOf(ref); } catch (e) { map[ref] = ref; return ref; }
        if (!b) { map[ref] = ''; return ''; }
        const path = ref.startsWith('local:') ? nameFn(b) : ref;
        map[ref] = path; files.push({ name: path, data: b }); return path;
      };
      const total = out.images.length;
      for (let i = 0; i < total; i++) {
        const im = out.images[i], nm = im.fileName || '';
        im.src = await pack(im.src, b => `assets/images/${im.id}.${G.extOf(b.type, nm)}`);
        im.thumb = (await pack(im.thumb, b => `assets/images/thumbs/${im.id}.${G.extOf(b.type, nm)}`)) || im.src;
        if (onProgress) onProgress(i + 1, total);
      }
      out.settings.logo = await pack(out.settings.logo, b => `assets/images/logo.${G.extOf(b.type)}`);
      out.settings.banner = await pack(out.settings.banner, b => `assets/images/banner.${G.extOf(b.type)}`);
      out.about.photo = await pack(out.about.photo, b => `assets/images/about.${G.extOf(b.type)}`);
      const json = JSON.stringify(out, null, 1);
      files.push({ name: 'data/gallery.json', data: json });
      files.push({ name: 'data/gallery.js', data: 'window.GALLERY_DATA = ' + JSON.stringify(out) + ';\n' });
      files.push({ name: 'README.txt', data: 'بسته انتشار گالری\n\nپوشه‌های data و assets/images را در ریشه مخزن GitHub خود جایگزین کنید (همان مسیرها)، سپس commit و push کنید.\n' });
      return G.zip(files);
    }
  };
})();
