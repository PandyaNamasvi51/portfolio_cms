(function () {
  const $ = s => document.querySelector(s);
  const app = $('#app');
  // field: [key, label, type, required]   type: text | area | number | date | image | check
  const C = {
    projects: { label: 'Projects', one: 'project', f: [['title', 'Title', 'text', 1], ['desc', 'Description', 'area'], ['tags', 'Tags (comma separated)'], ['link', 'Project link (https://...)'], ['image', 'Cover image', 'image'], ['featured', 'Show as featured', 'check']], t: r => r.title, sub: r => (r.featured ? 'Featured · ' : '') + (r.tags || '') },
    skills: { label: 'Skills', one: 'skill', f: [['name', 'Skill name', 'text', 1], ['level', 'Level (0 to 100)', 'number']], t: r => r.name, sub: r => r.level + '%' },
    blogs: { label: 'Blogs', one: 'post', f: [['title', 'Title', 'text', 1], ['date', 'Date', 'date'], ['excerpt', 'Short summary'], ['body', 'Full text (blank line = new paragraph)', 'area'], ['image', 'Cover image', 'image'], ['published', 'Published (untick to keep as draft)', 'check']], t: r => r.title, sub: r => (r.published === false ? 'Draft · ' : '') + (r.date || '') + ' · ' + (r.likes || 0) + ' likes' },
    experience: { label: 'Experience', one: 'role', f: [['role', 'Role', 'text', 1], ['company', 'Company'], ['period', 'Period'], ['desc', 'Description', 'area']], t: r => r.role, sub: r => r.company },
    testimonials: { label: 'Testimonials', one: 'testimonial', f: [['name', 'Name', 'text', 1], ['role', 'Role'], ['quote', 'Quote', 'area', 1]], t: r => r.name, sub: r => r.role },
    services: { label: 'Services', one: 'service', f: [['title', 'Title', 'text', 1], ['desc', 'Description', 'area']], t: r => r.title, sub: r => r.desc },
  };
  const ABOUT = [['name', 'Name', 'text', 1], ['title', 'Job title'], ['roles', 'Typing roles on the home page (comma separated)'], ['bio', 'Bio', 'area'], ['email', 'Public email'], ['location', 'Location'], ['github', 'GitHub URL'], ['linkedin', 'LinkedIn URL'], ['twitter', 'Twitter URL'], ['avatar', 'Profile photo', 'image']];
  const TABS = [['dashboard', 'Dashboard'], ['about', 'About'], ...Object.keys(C).map(k => [k, C[k].label]), ['messages', 'Messages']];
  const S = { tab: 'dashboard', edit: null, unread: 0 };

  function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.append(d); setTimeout(() => d.remove(), 2200); }
  const field = (f, v) => {
    const [k, label, type] = f, id = 'f_' + k;
    if (type === 'check') return `<label><input type="checkbox" id="${id}" ${v ? 'checked' : ''}> ${esc(label)}</label>`;
    if (type === 'image') return `<label for="${id}">${esc(label)}</label><input type="file" id="${id}_file" accept="image/*"><input type="hidden" id="${id}" value="${esc(v)}"><img class="preview" id="${id}_img" alt="" ${safeImg(v) ? `src="${esc(safeImg(v))}"` : 'hidden'}><div class="err" id="${id}_err"></div>`;
    if (type === 'area') return `<label for="${id}">${esc(label)}</label><textarea id="${id}">${esc(v)}</textarea>`;
    return `<label for="${id}">${esc(label)}</label><input id="${id}" type="${type || 'text'}" value="${esc(v)}">`;
  };
  function wireImages(fields) {
    fields.filter(f => f[2] === 'image').forEach(([k]) => {
      const file = $('#f_' + k + '_file');
      file.onchange = async () => {
        if (!file.files[0]) return;
        $('#f_' + k + '_err').textContent = 'Uploading...';
        const fd = new FormData(); fd.append('image', file.files[0]);
        try {
          const m = await api('/upload/image', { method: 'POST', body: fd, form: true });
          $('#f_' + k).value = m.url; $('#f_' + k + '_img').src = m.url; $('#f_' + k + '_img').hidden = false; $('#f_' + k + '_err').textContent = '';
        } catch (e) { $('#f_' + k + '_err').textContent = e.message; }
      };
    });
  }
  function collect(fields) {
    const o = {};
    fields.forEach(([k, , type]) => { const el = $('#f_' + k); o[k] = type === 'check' ? el.checked : type === 'number' ? Number(el.value) : el.value.trim(); });
    return o;
  }
  const missing = (fields, o) => fields.find(f => f[3] && !String(o[f[0]]).trim());

  /* login */
  function login(msg) {
    app.innerHTML = `<div class="cbar"><b>CMS admin</b><a class="btn ghost sm" href="../">View site</a></div><div class="login"><h2>Sign in</h2><p style="color:var(--mut)">Use the ADMIN_EMAIL and ADMIN_PASSWORD from your .env file.</p><label for="lu">Email</label><input id="lu" type="email" autocomplete="username"><label for="lp">Password</label><input id="lp" type="password" autocomplete="current-password"><div class="err" id="le">${esc(msg || '')}</div><p><button class="btn" id="li">Sign in</button></p></div>`;
    const go = async () => {
      $('#li').disabled = true;
      try {
        const d = await api('/auth/login', { method: 'POST', body: { email: $('#lu').value, password: $('#lp').value } });
        store.set('at', d.accessToken); store.set('rt', d.refreshToken); shell();
      } catch (e) { $('#le').textContent = e.message; $('#li').disabled = false; }
    };
    $('#li').onclick = go; $('#lp').onkeydown = e => { if (e.key === 'Enter') go(); };
  }
  function logout() { store.set('at', null); store.set('rt', null); login(); }

  /* layout */
  async function shell() {
    try { const s = await api('/stats/admin'); S.unread = s.unread; S.stats = s; } catch (e) { if (e.status === 401) return login('Session expired. Sign in again.'); }
    app.innerHTML = `<div class="cbar"><b>CMS admin</b><a class="btn ghost sm" href="../" target="_blank" rel="noopener">View site</a><button class="btn ghost sm" id="out">Sign out</button></div><div class="lay"><div class="side">${TABS.map(t => `<button class="${t[0] === S.tab ? 'on' : ''}" data-tab="${t[0]}">${t[1]}${t[0] === 'messages' && S.unread ? `<span class="pill">${S.unread}</span>` : ''}</button>`).join('')}</div><div class="main" id="main">Loading...</div></div>`;
    $('#out').onclick = logout;
    app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { S.tab = b.dataset.tab; S.edit = null; shell(); });
    try {
      if (S.tab === 'dashboard') dash(); else if (S.tab === 'about') await about(); else if (S.tab === 'messages') await messages(); else await coll(S.tab);
    } catch (e) { if (e.status === 401) login('Session expired. Sign in again.'); else $('#main').innerHTML = `<div class="err">${esc(e.message)}</div>`; }
  }

  /* dashboard */
  async function dash() {
    const s = S.stats, msgs = await api('/messages');
    const max = Math.max(1, ...s.last7.map(d => d.count));
    const bars = s.last7.map((d, i) => { const h = Math.round((d.count / max) * 90); return `<rect x="${i * 44 + 8}" y="${110 - h}" width="30" height="${h}" rx="4" fill="var(--acc)"/><text x="${i * 44 + 23}" y="126" font-size="11" text-anchor="middle" fill="var(--mut)">${d.day}</text><text x="${i * 44 + 23}" y="${104 - h}" font-size="11" text-anchor="middle" fill="var(--fg)">${d.count || ''}</text>`; }).join('');
    $('#main').innerHTML = `<h2>Dashboard</h2><div class="stats">${[['Visitors', s.visits], ['Projects', s.projects], ['Skills', s.skills], ['Blog posts', s.blogs], ['Post likes', s.likes], ['Unread messages', s.unread]].map(x => `<div class="card"><b>${x[1]}</b>${x[0]}</div>`).join('')}</div><div class="card"><h3>Messages in the last 7 days</h3><svg viewBox="0 0 316 134" width="100%" role="img" aria-label="Bar chart of messages per day">${bars}</svg></div><h3 style="margin:22px 0 6px">Latest messages</h3>${msgs.slice(0, 3).map(m => `<div class="row2"><span><b>${esc(m.name)}</b> ${m.read ? '' : '<span class="pill">new</span>'}<small>${esc(m.message.slice(0, 120))}</small></span></div>`).join('') || '<p style="color:var(--mut)">No messages yet.</p>'}`;
  }

  /* about (single document) */
  async function about() {
    const a = await api('/about');
    $('#main').innerHTML = `<h2>About</h2>${ABOUT.map(f => field(f, a[f[0]])).join('')}<div class="err" id="err"></div><p><button class="btn" id="save">Save changes</button></p>`;
    wireImages(ABOUT);
    $('#save').onclick = async () => {
      const o = collect(ABOUT), m = missing(ABOUT, o);
      if (m) { $('#err').textContent = m[1] + ' is required.'; return; }
      try { await api('/about', { method: 'PUT', body: o }); toast('Saved'); } catch (e) { $('#err').textContent = e.message; }
    };
  }

  /* generic collections */
  async function coll(k) {
    const c = C[k];
    if (S.edit !== null) {
      const r = S.edit === 'new' ? { published: true, level: 50 } : S.edit;
      $('#main').innerHTML = `<h2>${S.edit === 'new' ? 'New ' + c.one : 'Edit ' + c.one}</h2>${c.f.map(f => field(f, r[f[0]])).join('')}<div class="err" id="err"></div><p><button class="btn" id="save">Save ${c.one}</button> <button class="btn ghost" id="cancel">Cancel</button></p>`;
      wireImages(c.f);
      $('#cancel').onclick = () => { S.edit = null; shell(); };
      $('#save').onclick = async () => {
        const o = collect(c.f), m = missing(c.f, o);
        if (m) { $('#err').textContent = m[1] + ' is required.'; return; }
        $('#save').disabled = true;
        try { S.edit === 'new' ? await api('/' + k, { method: 'POST', body: o }) : await api(`/${k}/${S.edit._id}`, { method: 'PUT', body: o }); S.edit = null; toast('Saved'); shell(); }
        catch (e) { $('#err').textContent = e.message; $('#save').disabled = false; }
      };
      return;
    }
    const rows = await api('/' + k);
    $('#main').innerHTML = `<h2>${c.label}</h2><p><button class="btn" id="add">Add ${c.one}</button></p><input id="find" placeholder="Search ${c.label.toLowerCase()}" aria-label="Search" style="margin:8px 0"><div id="rows"></div>`;
    $('#add').onclick = () => { S.edit = 'new'; shell(); };
    const draw = () => {
      const q = $('#find').value.toLowerCase(), view = rows.filter(r => (c.t(r) + ' ' + c.sub(r)).toLowerCase().includes(q));
      $('#rows').innerHTML = view.map(r => `<div class="row2"><span>${esc(c.t(r))}<small>${esc(c.sub(r))}</small></span><button class="btn ghost sm" data-ed="${r._id}">Edit</button><button class="btn danger sm" data-del="${r._id}">Delete</button></div>`).join('') || `<p style="color:var(--mut)">Nothing here yet. Add your first ${c.one}.</p>`;
      $('#rows').querySelectorAll('[data-ed]').forEach(b => b.onclick = () => { S.edit = rows.find(r => r._id === b.dataset.ed); shell(); });
      $('#rows').querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        if (!confirm('Delete this ' + c.one + '? This cannot be undone.')) return;
        try { await api(`/${k}/${b.dataset.del}`, { method: 'DELETE' }); toast('Deleted'); shell(); } catch (e) { toast(e.message); }
      });
    };
    $('#find').oninput = draw; draw();
  }

  /* messages */
  async function messages() {
    const rows = await api('/messages');
    $('#main').innerHTML = `<h2>Messages</h2>` + (rows.map(m => `<div class="row2"><span><b>${esc(m.name)}</b> ${m.read ? '' : '<span class="pill">new</span>'}<small>${esc(m.email)} · ${new Date(m.createdAt).toLocaleString()}</small>${esc(m.message)}</span>${m.read ? '' : `<button class="btn ghost sm" data-read="${m._id}">Mark read</button>`}<a class="btn ghost sm" href="mailto:${esc(m.email)}">Reply</a><button class="btn danger sm" data-del="${m._id}">Delete</button></div>`).join('') || '<p style="color:var(--mut)">No messages yet. Send one from the Contact form on your site.</p>');
    $('#main').querySelectorAll('[data-read]').forEach(b => b.onclick = async () => { try { await api(`/messages/${b.dataset.read}/read`, { method: 'PATCH' }); shell(); } catch (e) { toast(e.message); } });
    $('#main').querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (confirm('Delete this message?')) { try { await api('/messages/' + b.dataset.del, { method: 'DELETE' }); toast('Deleted'); shell(); } catch (e) { toast(e.message); } } });
  }

  store.get('at') ? shell() : login();
})();
