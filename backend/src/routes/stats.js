const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const M = require('../models');

const visits = async () => (await M.Stat.findOne({ key: 'site' }))?.visits || 0;

// Public numbers shown on the portfolio
router.get('/', async (req, res, next) => {
  try {
    const [projects, skills, blogs, experience, v] = await Promise.all([
      M.Project.countDocuments(), M.Skill.countDocuments(), M.Blog.countDocuments({ published: true }), M.Experience.countDocuments(), visits(),
    ]);
    res.json({ projects, skills, blogs, experience, visits: v });
  } catch (e) { next(e); }
});

// Called once per browser session by the portfolio
router.post('/visit', rateLimit({ windowMs: 60 * 60 * 1000, max: 30 }), async (req, res, next) => {
  try {
    const s = await M.Stat.findOneAndUpdate({ key: 'site' }, { $inc: { visits: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    res.json({ visits: s.visits });
  } catch (e) { next(e); }
});

// Dashboard numbers for the admin panel
router.get('/admin', auth, async (req, res, next) => {
  try {
    const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - 6);
    const [counts, unread, totalMessages, likes, v, perDay] = await Promise.all([
      Promise.all(['Project', 'Skill', 'Blog', 'Experience', 'Testimonial', 'Service'].map(n => M[n].countDocuments())),
      M.Message.countDocuments({ read: false }),
      M.Message.countDocuments(),
      M.Blog.aggregate([{ $group: { _id: null, n: { $sum: '$likes' } } }]),
      visits(),
      M.Message.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } }]),
    ]);
    const map = Object.fromEntries(perDay.map(d => [d._id, d.n]));
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(since); d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      return { day: key.slice(5), count: map[key] || 0 };
    });
    res.json({
      projects: counts[0], skills: counts[1], blogs: counts[2], experience: counts[3], testimonials: counts[4], services: counts[5],
      unread, totalMessages, likes: likes[0]?.n || 0, visits: v, last7,
    });
  } catch (e) { next(e); }
});

module.exports = router;
