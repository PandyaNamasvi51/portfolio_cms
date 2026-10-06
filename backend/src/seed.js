// Creates the admin user and fills empty collections with sample content.
// Safe to run again: it never duplicates content and never deletes anything.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const M = require('./models');

const sample = {
  Skill: [['React / Next.js', 92], ['Node.js / Express', 88], ['MongoDB', 82], ['Tailwind CSS', 90], ['JWT authentication', 80], ['REST API design', 86]].map(([name, level]) => ({ name, level })),
  Project: [
    { title: 'Custom CMS', desc: 'Admin panel, REST API, media uploads and JWT login built from scratch, no headless CMS.', tags: 'Node, Express, MongoDB', featured: true },
    { title: 'Shop dashboard', desc: 'Sales analytics with live charts and role-based access.', tags: 'React, Charts' },
    { title: 'Booking app', desc: 'Appointment scheduling with email reminders.', tags: 'MERN, Nodemailer' },
    { title: 'Weather widget', desc: 'Location-aware forecast with a clean mobile layout.', tags: 'JavaScript, API' },
  ],
  Experience: [
    { role: 'Freelance web developer', company: 'Self-employed', period: '2025', desc: 'Delivered three small business websites.' },
    { role: 'Software engineering intern', company: 'Your company', period: '2026 - now', desc: 'Building the company portfolio platform and its custom CMS.' },
  ],
  Service: [
    { title: 'Websites', desc: 'Fast, responsive, SEO-ready sites.' },
    { title: 'APIs and backends', desc: 'Secure REST APIs with authentication.' },
    { title: 'Admin panels', desc: 'Dashboards so clients edit their own content.' },
  ],
  Testimonial: [
    { name: 'Team lead', role: 'Internship mentor', quote: 'Delivered the whole stack in two weeks, and the admin panel is genuinely easy to use.' },
    { name: 'First client', role: 'Small business owner', quote: 'I update my own site now. I never need to ask for changes.' },
  ],
  Blog: [
    { title: 'How I built a CMS from scratch', date: '2026-10-02', excerpt: 'Schemas, JWT auth and CRUD routes, step by step.', body: 'Start with the content models.\n\nThen add protected routes with a JWT middleware.\n\nFinally build one generic CRUD screen and reuse it for every model.' },
    { title: 'JWT without the confusion', date: '2026-09-25', excerpt: 'Access tokens, refresh tokens and where to keep them.', body: 'Use a short-lived access token and a longer refresh token.\n\nThe client retries a failed request once after refreshing.' },
  ],
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase();
  if (!email || !process.env.ADMIN_PASSWORD) { console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env'); process.exit(1); }
  await M.User.findOneAndUpdate({ email }, { email, password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12), role: 'admin' }, { upsert: true });
  console.log('Admin ready:', email);

  if (!(await M.About.countDocuments())) {
    await M.About.create({ name: 'Your Name', title: 'Full-stack developer', roles: 'Full-stack developer, API builder, CMS creator', bio: 'I build web products end to end: a React frontend, a Node API and the admin tools behind them. This site runs on a CMS I wrote from scratch.', email, location: 'India' });
  }
  for (const [model, rows] of Object.entries(sample)) {
    if (await M[model].countDocuments()) continue;
    for (const r of rows) await M[model].create(r); // one by one so createdAt order is kept
    console.log('Added sample', model);
  }
  process.exit(0);
})();
