const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { User } = require('../models');

const sign = u => ({
  accessToken: jwt.sign({ id: u._id, role: u.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' }),
  refreshToken: jwt.sign({ id: u._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' }),
});

router.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user || !(await bcrypt.compare(String(password), user.password)))
      return res.status(401).json({ error: 'Wrong email or password' });
    res.json({ ...sign(user), user: { id: user._id, email: user.email, role: user.role } });
  } catch (e) { next(e); }
});

router.post('/refresh', async (req, res) => {
  try {
    const payload = jwt.verify(req.body.refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.id);
    if (!user) throw new Error('no user');
    res.json(sign(user));
  } catch {
    res.status(401).json({ error: 'Refresh token invalid or expired' });
  }
});

module.exports = router;
