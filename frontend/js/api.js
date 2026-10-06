(function () {
  const BASE = (window.API_URL || '').replace(/\/$/, '');
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} },
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => (/^https?:\/\//i.test(u || '') ? u : '');
  const safeImg = u => (/^(https?:\/\/|\/uploads\/)/i.test(u || '') ? u : '');

  async function refresh() {
    const rt = store.get('rt');
    if (!rt) return false;
    try {
      const r = await fetch(BASE + '/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: rt }) });
      if (!r.ok) return false;
      const d = await r.json();
      store.set('at', d.accessToken); store.set('rt', d.refreshToken);
      return true;
    } catch (e) { return false; }
  }

  // api('/projects'), api('/projects', {method:'POST', body:{...}}), api('/upload/image', {method:'POST', body:formData, form:true})
  async function api(path, o = {}) {
    const run = () => {
      const h = {};
      if (!o.form) h['Content-Type'] = 'application/json';
      const at = store.get('at');
      if (at) h.Authorization = 'Bearer ' + at;
      return fetch(BASE + path, { method: o.method || 'GET', headers: h, body: o.body ? (o.form ? o.body : JSON.stringify(o.body)) : undefined });
    };
    let r = await run();
    if (r.status === 401 && store.get('rt') && path !== '/auth/login' && (await refresh())) r = await run();
    let data = null;
    try { data = await r.json(); } catch (e) {}
    if (!r.ok) { const err = new Error((data && data.error) || 'Request failed (' + r.status + ')'); err.status = r.status; throw err; }
    return data;
  }
  Object.assign(window, { api, store, esc, safeUrl, safeImg });
})();
