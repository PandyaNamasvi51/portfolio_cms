const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const M = require('../models');

const rx = s => new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

// Standard CRUD. GET is public, writes need a JWT.
// Supports ?q=search  ?tag=x  ?limit=&page=  (total is returned in the X-Total-Count header).
function crud(Model, opts = {}) {
  const r = Router();
  r.get('/', auth.optional, async (req, res, next) => {
    try {
      const { q, tag, limit, page } = req.query;
      const filter = {};
      if (opts.publicFilter && !req.user) Object.assign(filter, opts.publicFilter);
      if (q && opts.search) filter.$or = opts.search.map(f => ({ [f]: rx(q) }));
      if (tag && opts.tagField) filter[opts.tagField] = rx(tag);
      let query = Model.find(filter).sort(opts.sort || { createdAt: -1 });
      const total = await Model.countDocuments(filter);
      const lim = Math.min(parseInt(limit, 10) || 0, 100);
      if (lim) query = query.skip((Math.max(parseInt(page, 10) || 1, 1) - 1) * lim).limit(lim);
      res.set('X-Total-Count', String(total)).json(await query);
    } catch (e) { next(e); }
  });
  r.get('/:id', auth.optional, async (req, res, next) => {
    try {
      const d = await Model.findById(req.params.id);
      if (!d || (opts.publicFilter && !req.user && d.published === false)) return res.status(404).json({ error: 'Not found' });
      res.json(d);
    } catch (e) { next(e); }
  });
  r.post('/', auth, async (req, res, next) => { try { res.status(201).json(await Model.create(req.body)); } catch (e) { next(e); } });
  r.put('/:id', auth, async (req, res, next) => {
    try {
      const d = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      d ? res.json(d) : res.status(404).json({ error: 'Not found' });
    } catch (e) { next(e); }
  });
  r.delete('/:id', auth, async (req, res, next) => {
    try { const d = await Model.findByIdAndDelete(req.params.id); d ? res.json({ deleted: true }) : res.status(404).json({ error: 'Not found' }); } catch (e) { next(e); }
  });
  return r;
}

const router = Router();

// About is a single document: GET returns it, PUT creates or updates it.
router.get('/about', async (req, res, next) => { try { res.json((await M.About.findOne()) || {}); } catch (e) { next(e); } });
router.put('/about', auth, async (req, res, next) => {
  try {
    res.json(await M.About.findOneAndUpdate({}, req.body, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }));
  } catch (e) { next(e); }
});

// Public "like" button for a blog post (5 likes per hour per visitor).
router.post('/blogs/:id/like', rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { error: 'Too many likes. Try later.' } }), async (req, res, next) => {
  try {
    const b = await M.Blog.findOneAndUpdate({ _id: req.params.id, published: true }, { $inc: { likes: 1 } }, { new: true });
    b ? res.json({ likes: b.likes }) : res.status(404).json({ error: 'Not found' });
  } catch (e) { next(e); }
});

router.use('/skills', crud(M.Skill, { sort: { level: -1 }, search: ['name'] }));
router.use('/projects', crud(M.Project, { search: ['title', 'desc', 'tags'], tagField: 'tags', sort: { featured: -1, createdAt: -1 } }));
router.use('/blogs', crud(M.Blog, { search: ['title', 'excerpt', 'body'], publicFilter: { published: true } }));
router.use('/experience', crud(M.Experience));
router.use('/testimonials', crud(M.Testimonial));
router.use('/services', crud(M.Service));

// Admin-only: contact messages and media library
const admin = Router();
admin.get('/messages', auth, async (req, res, next) => { try { res.json(await M.Message.find().sort({ createdAt: -1 })); } catch (e) { next(e); } });
admin.patch('/messages/:id/read', auth, async (req, res, next) => {
  try { const m = await M.Message.findByIdAndUpdate(req.params.id, { read: true }, { new: true }); m ? res.json(m) : res.status(404).json({ error: 'Not found' }); } catch (e) { next(e); }
});
admin.delete('/messages/:id', auth, async (req, res, next) => { try { await M.Message.findByIdAndDelete(req.params.id); res.json({ deleted: true }); } catch (e) { next(e); } });
admin.get('/media', auth, async (req, res, next) => { try { res.json(await M.Media.find().sort({ createdAt: -1 })); } catch (e) { next(e); } });
router.use('/', admin);

module.exports = router;
