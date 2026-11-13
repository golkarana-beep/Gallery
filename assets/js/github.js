/* انتشار مستقیم گالری روی GitHub از داخل پنل (GitHub REST API، یک commit برای همه تغییرات) */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const KEY = 'gal_gh';
  const branchPath = b => String(b).split('/').map(encodeURIComponent).join('/');
  async function api(cfg, method, path, body) {
    const r = await fetch('https://api.github.com/repos/' + encodeURIComponent(cfg.owner) + '/' + encodeURIComponent(cfg.repo) + path, {
      method, headers: Object.assign({ Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + cfg.token, 'X-GitHub-Api-Version': '2022-11-28' }, body ? { 'Content-Type': 'application/json' } : {}),
      body: body ? JSON.stringify(body) : undefined
    });
    if (!r.ok) { let m = ''; try { m = (await r.json()).message; } catch (e) {} const err = new Error(m || 'HTTP ' + r.status); err.status = r.status; throw err; }
    return r.status === 204 ? null : r.json();
  }
  function toB64(d) {
    if (typeof d === 'string') return Promise.resolve(btoa(unescape(encodeURIComponent(d))));
    if (ArrayBuffer.isView(d)) { let bin = ''; for (let i = 0; i < d.length; i += 0x8000) bin += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000)); return Promise.resolve(btoa(bin)); }
    return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] || ''); fr.onerror = () => rej(fr.error); fr.readAsDataURL(d); });
  }
  G.GitHub = {
    guess() {
      const h = location.hostname, p = location.pathname.split('/').filter(Boolean);
      if (/\.github\.io$/.test(h)) { const o = h.split('.')[0]; const repo = p.length && !/\.html?$/.test(p[0]) ? p[0] : o + '.github.io'; return { owner: o, repo, branch: 'main', token: '' }; }
      return { owner: '', repo: '', branch: 'main', token: '' };
    },
    getCfg() { try { return Object.assign(this.guess(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return this.guess(); } },
    setCfg(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} },
    forgetToken() { const c = this.getCfg(); c.token = ''; this.setCfg(c); },
    explain(e) {
      if (e && e.status === 401) return 'توکن نامعتبر یا منقضی شده است.';
      if (e && e.status === 403) return 'دسترسی کافی نیست: برای توکن مجوز «Contents: Read and write» را فعال کنید (یا محدودیت تعداد درخواست رسیده است).';
      if (e && e.status === 404) return 'مخزن یا شاخه پیدا نشد؛ نام کاربری، نام مخزن، شاخه و دسترسی توکن را بررسی کنید.';
      if (e && e.status === 409) return 'مخزن خالی است یا تداخل رخ داد؛ یک commit اولیه (مثلاً README) بسازید و دوباره تلاش کنید.';
      if (e && e instanceof TypeError) return 'اتصال به GitHub برقرار نشد؛ اینترنت را بررسی کنید.';
      return 'خطا: ' + ((e && e.message) || 'نامشخص');
    },
    async test(cfg) {
      const repo = await api(cfg, 'GET', '');
      if (repo.permissions && !repo.permissions.push) throw Object.assign(new Error('no push'), { status: 403 });
      await api(cfg, 'GET', '/branches/' + branchPath(cfg.branch));
      return repo.full_name;
    },
    async publish(cfg, data, status) {
      const say = m => status && status(m);
      say('در حال اتصال به GitHub…');
      const bp = branchPath(cfg.branch);
      const ref = await api(cfg, 'GET', '/git/ref/heads/' + bp), head = ref.object.sha;
      const commit = await api(cfg, 'GET', '/git/commits/' + head), base = commit.tree.sha;
      const tree = await api(cfg, 'GET', '/git/trees/' + base + '?recursive=1');
      const remote = new Set(tree.tree.filter(t => t.type === 'blob').map(t => t.path));
      const known = await G.Store.getPubMap();
      say('آماده‌سازی فایل‌ها…');
      const r = await G.Store.buildFiles(data, { known, remote });
      const keep = new Set(r.files.map(f => f.name));
      r.out.images.forEach(i => { keep.add(i.src); keep.add(i.thumb); });
      [r.out.settings.logo, r.out.settings.banner, r.out.about.photo].forEach(x => x && keep.add(x));
      const entries = []; let n = 0;
      for (const f of r.files) {
        say(`ارسال فایل ${G.fa(++n)} از ${G.fa(r.files.length)}…`);
        const b = await api(cfg, 'POST', '/git/blobs', { content: await toB64(f.data), encoding: 'base64' });
        entries.push({ path: f.name, mode: '100644', type: 'blob', sha: b.sha });
      }
      let deleted = 0;
      if (!tree.truncated) for (const p of remote) if (p.startsWith('assets/images/') && !keep.has(p)) { entries.push({ path: p, mode: '100644', type: 'blob', sha: null }); deleted++; }
      say('ثبت commit…');
      const nt = await api(cfg, 'POST', '/git/trees', { base_tree: base, tree: entries });
      if (nt.sha === base) return { unchanged: true };
      const nc = await api(cfg, 'POST', '/git/commits', { message: 'به‌روزرسانی گالری از پنل مدیریت', tree: nt.sha, parents: [head] });
      await api(cfg, 'PATCH', '/git/refs/heads/' + bp, { sha: nc.sha });
      await G.Store.setPubMap(Object.assign({}, known, r.newLocal));
      return { commit: nc.sha, uploaded: r.files.length - 2, deleted };
    }
  };
})();
