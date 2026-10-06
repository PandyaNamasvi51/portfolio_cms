const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const { Message } = require('../models');

const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { error: 'Too many messages. Try again later.' } });

async function sendMail(m) {
  if (!process.env.SMTP_HOST) return;
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: +process.env.SMTP_PORT || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await t.sendMail({
    from: process.env.SMTP_USER, to: process.env.MAIL_TO, replyTo: m.email,
    subject: `Portfolio message from ${m.name}`, text: `${m.message}\n\nFrom: ${m.name} <${m.email}>`,
  });
}

router.post('/', limiter, async (req, res, next) => {
  try {
    const { name, email, message } = req.body || {};
    if (!name || !message || !/^\S+@\S+\.\S+$/.test(email || ''))
      return res.status(400).json({ error: 'Enter your name, a valid email and a message' });
    const saved = await Message.create({ name: String(name).slice(0, 100), email: String(email).slice(0, 200), message: String(message).slice(0, 4000) });
    sendMail(saved).catch(e => console.error('Email failed:', e.message)); // the message is already saved
    res.status(201).json({ sent: true });
  } catch (e) { next(e); }
});

module.exports = router;
