(function () {
  const $ = s => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const D = { about: {}, skills: [], projects: [], experience: [], services: [], testimonials: [], blogs: [], stats: {} };
  const view = { q: '', tag: '' };

  function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.append(d); setTimeout(() => d.remove(), 2200); }

  /* theme + scroll progress */
  const root = document.documentElement;
  if (store.get('theme')) root.dataset.theme = store.get('theme');
  $('#theme').onclick = () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark'; store.set('theme', root.dataset.theme);
  };
  addEventListener('scroll', () => { const h = root; $('#progress').style.width = (h.scrollTop / ((h.scrollHeight - h.clientHeight) || 1)) * 100 + '%'; }, { passive: true });

  /* hero */
  function typing(words) {
    const el = $('#typed');
    if (reduce || words.length < 2) { el.textContent = words[0] || ''; return; }
    let w = 0, c = 0, del = false;
    (function tick() {
      const word = words[w]; c += del ? -1 : 1; el.textContent = word.slice(0, c);
      let d = del ? 40 : 80;
      if (!del && c === word.length) { del = true; d = 1400; } else if (del && c === 0) { del = false; w = (w + 1) % words.length; d = 300; }
      setTimeout(tick, d);
    })();
  }
  function hero() {
    const a = D.about;
    document.title = (a.name || 'Portfolio') + (a.title ? ' | ' + a.title : '');
    $('#logo').textContent = a.name || 'Portfolio'; $('#fName').textContent = a.name ? '© ' + new Date().getFullYear() + ' ' + a.name : '';
    $('#hName').textContent = a.name || 'Welcome'; $('#hBio').textContent = a.bio || '';
    typing(String(a.roles || a.title || '').split(',').map(s => s.trim()).filter(Boolean));
    const av = safeImg(a.avatar);
    $('#avatar').innerHTML = av ? `<img src="${esc(av)}" alt="${esc(a.name)}">` : esc((a.name || '?').trim().charAt(0).toUpperCase());
    const links = [['GitHub', safeUrl(a.github)], ['LinkedIn', safeUrl(a.linkedin)], ['Twitter', safeUrl(a.twitter)]].filter(l => l[1]);
    if (a.email) links.push(['Email', 'mailto:' + a.email]);
    $('#social').innerHTML = links.map(l => `<a class="btn ghost sm" href="${esc(l[1])}" rel="noopener">${l[0]}</a>`).join('');
  }

  /* counters */
  function count(el, to) {
    if (reduce) { el.textContent = to; return; }
    const t0 = performance.now();
    (function f(t) { const p = Math.min(1, (t - t0) / 1200); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0);
  }
  function stats() {
    const s = D.stats, items = [['Projects', s.projects], ['Skills', s.skills], ['Blog posts', s.blogs], ['Visitors', s.visits]];
    $('#stats').innerHTML = items.map(i => `<div><b data-to="${+i[1] || 0}">0</b><span>${i[0]}</span></div>`).join('');
    new IntersectionObserver((es, ob) => { es.forEach(e => { if (e.isIntersecting) { e.target.querySelectorAll('b').forEach(b => count(b, +b.dataset.to)); ob.disconnect(); } }); }).observe($('#stats'));
    $('#fVisits').textContent = (s.visits || 0) + ' visits';
  }

  /* sections */
  function skills() {
    $('#skillList').innerHTML = D.skills.map(s => `<div class="skill"><div><span>${esc(s.name)}</span><span>${+s.level || 0}%</span></div><div class="bar"><i data-w="${Math.min(100, +s.level || 0)}"></i></div></div>`).join('') || '<p>No skills added yet.</p>';
    new IntersectionObserver((es, ob) => { es.forEach(e => { if (e.isIntersecting) { e.target.querySelectorAll('i').forEach(i => i.style.width = i.dataset.w + '%'); ob.disconnect(); } }); }).observe($('#skillList'));
  }
  const tagsOf = p => String(p.tags || '').split(',').map(t => t.trim()).filter(Boolean);
  function projects() {
    const all = [...new Set(D.projects.flatMap(tagsOf))];
    $('#chips').innerHTML = ['All', ...all].map(t => `<button class="chip ${(t === 'All' && !view.tag) || t === view.tag ? 'on' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('') + `<input id="pq" placeholder="Search projects" aria-label="Search projects" value="${esc(view.q)}">`;
    $('#chips').querySelectorAll('.chip').forEach(b => b.onclick = () => { view.tag = b.dataset.tag === 'All' ? '' : b.dataset.tag; projects(); });
    const pq = $('#pq'); pq.oninput = () => { view.q = pq.value; list(); };
    if (view.q) pq.focus(); // keep typing after re-render
    list();
  }
  function list() {
    const q = view.q.toLowerCase();
    const rows = D.projects.filter(p => (!view.tag || tagsOf(p).includes(view.tag)) && (!q || (p.title + ' ' + p.desc + ' ' + p.tags).toLowerCase().includes(q)));
    $('#projList').innerHTML = rows.map(p => {
      const img = safeImg(p.image), link = safeUrl(p.link);
      return `<div class="card proj">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : '<div class="ph"></div>'}<div class="body">${p.featured ? '<span class="badge">Featured</span>' : ''}<h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p><div class="tags">${tagsOf(p).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>${link ? `<p style="margin-top:12px"><a href="${esc(link)}" rel="noopener" style="color:var(--acc)">View project</a></p>` : ''}</div></div>`;
    }).join('') || '<p>No projects match. Try another tag or search.</p>';
  }
  function simple() {
    $('#expList').innerHTML = D.experience.map(e => `<div class="it"><b>${esc(e.role)}</b><small>${esc(e.company)}${e.period ? ', ' + esc(e.period) : ''}</small><p style="margin:6px 0 0;color:var(--mut)">${esc(e.desc)}</p></div>`).join('');
    $('#svcList').innerHTML = D.services.map(s => `<div class="card"><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p></div>`).join('');
  }
  let qi = 0, timer;
  function quotes() {
    const t = D.testimonials; if (!t.length) { $('#testimonials').hidden = true; return; }
    const show = i => {
      qi = i; const x = t[i];
      $('#quote').innerHTML = `<p>${esc(x.quote)}</p><footer>${esc(x.name)}${x.role ? ', ' + esc(x.role) : ''}</footer>`;
      $('#dots').innerHTML = t.map((_, j) => `<button class="${j === i ? 'on' : ''}" data-i="${j}" aria-label="Show testimonial ${j + 1}"></button>`).join('');
      $('#dots').querySelectorAll('button').forEach(b => b.onclick = () => { show(+b.dataset.i); });
    };
    show(0);
    if (!reduce && t.length > 1) { timer = setInterval(() => { if (!$('#quote').matches(':hover')) show((qi + 1) % t.length); }, 6000); }
  }
  const mins = b => Math.max(1, Math.round(String(b.body || '').split(/\s+/).length / 200));
  const liked = () => { try { return JSON.parse(store.get('liked') || '[]'); } catch (e) { return []; } };
  function blogs() {
    $('#blogList').innerHTML = D.blogs.map((b, i) => `<div class="card">${b.published === false ? '<span class="badge">Draft</span>' : ''}<small style="color:var(--mut)">${esc(b.date)} · ${mins(b)} min read</small><h3>${esc(b.title)}</h3><p>${esc(b.excerpt)}</p><div class="meta"><button class="btn ghost sm" data-open="${i}">Read post</button><button class="like ${liked().includes(b._id) ? 'on' : ''}" data-like="${i}" aria-label="Like this post">♥ <span>${+b.likes || 0}</span></button></div></div>`).join('') || '<p>No posts yet.</p>';
    $('#blogList').querySelectorAll('[data-open]').forEach(b => b.onclick = () => openPost(D.blogs[+b.dataset.open]));
    $('#blogList').querySelectorAll('[data-like]').forEach(b => b.onclick = async () => {
      const p = D.blogs[+b.dataset.like], l = liked();
      if (l.includes(p._id)) return toast('You already liked this post');
      try { const r = await api(`/blogs/${p._id}/like`, { method: 'POST' }); p.likes = r.likes; store.set('liked', JSON.stringify([...l, p._id])); blogs(); }
      catch (e) { toast(e.message); }
    });
  }
  function openPost(p) {
    $('#pTitle').textContent = p.title; $('#pMeta').textContent = `${p.date || ''} · ${mins(p)} min read`;
    $('#pBody').innerHTML = String(p.body || p.excerpt || '').split(/\n+/).map(x => `<p>${esc(x)}</p>`).join('');
    $('#post').showModal();
  }
  $('#pClose').onclick = () => $('#post').close();

  /* contact form */
  $('#send').onclick = async () => {
    const btn = $('#send'), body = { name: $('#cn').value.trim(), email: $('#ce').value.trim(), message: $('#cm').value.trim() };
    $('#cerr').textContent = ''; $('#cok').textContent = '';
    if (!body.name || !/^\S+@\S+\.\S+$/.test(body.email) || !body.message) { $('#cerr').textContent = 'Enter your name, a valid email and a message.'; return; }
    btn.disabled = true; btn.textContent = 'Sending...';
    try { await api('/contact', { method: 'POST', body }); $('#cok').textContent = 'Message sent. Thank you, I will reply soon.'; $('#cn').value = $('#ce').value = $('#cm').value = ''; }
    catch (e) { $('#cerr').textContent = e.message; }
    btn.disabled = false; btn.textContent = 'Send message';
  };

  /* command palette (Ctrl/Cmd + K) */
  let items = [], sel = 0;
  function palItems() {
    return [...['skills', 'projects', 'experience', 'services', 'blog', 'contact'].map(s => ({ t: s[0].toUpperCase() + s.slice(1), k: 'Section', go: () => { location.hash = s; } })),
      ...D.projects.map(p => ({ t: p.title, k: 'Project', go: () => { view.q = p.title; view.tag = ''; projects(); location.hash = 'projects'; } })),
      ...D.blogs.map(b => ({ t: b.title, k: 'Post', go: () => openPost(b) })),
      { t: 'Toggle theme', k: 'Action', go: () => $('#theme').click() }];
  }
  function palDraw() {
    const q = $('#palq').value.toLowerCase();
    items = palItems().filter(i => i.t.toLowerCase().includes(q)); sel = Math.min(sel, Math.max(0, items.length - 1));
    $('#pall').innerHTML = items.map((i, n) => `<li class="${n === sel ? 'on' : ''}" data-n="${n}">${esc(i.t)}<small>${i.k}</small></li>`).join('') || '<li>No results</li>';
    $('#pall').querySelectorAll('li[data-n]').forEach(li => li.onclick = () => run(+li.dataset.n));
  }
  function run(n) { const i = items[n]; if (!i) return; $('#pal').close(); i.go(); }
  function openPal() { $('#palq').value = ''; sel = 0; palDraw(); $('#pal').showModal(); $('#palq').focus(); }
  $('#openPal').onclick = openPal;
  $('#palq').oninput = () => { sel = 0; palDraw(); };
  $('#palq').onkeydown = e => {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, items.length - 1); palDraw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); palDraw(); e.preventDefault(); }
    else if (e.key === 'Enter') run(sel);
  };
  addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPal(); } });

  /* load everything from the API */
  async function load() {
    const keys = ['about', 'skills', 'projects', 'experience', 'services', 'testimonials', 'blogs', 'stats'];
    const res = await Promise.allSettled(keys.map(k => api('/' + k)));
    if (res.every(r => r.status === 'rejected')) { $('#apiErr').hidden = false; return; }
    res.forEach((r, i) => { if (r.status === 'fulfilled') D[keys[i]] = r.value; });
    if (!sessionStorage.getItem('visited')) {
      try { sessionStorage.setItem('visited', '1'); } catch (e) {}
      try { D.stats.visits = (await api('/stats/visit', { method: 'POST' })).visits; } catch (e) {}
    }
    hero(); stats(); skills(); projects(); simple(); quotes(); blogs();
  }
  load();
})();
