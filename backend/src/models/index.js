const { Schema, model } = require('mongoose');
const make = (name, def, hook) => {
  const s = new Schema(def, { timestamps: true });
  if (hook) hook(s);
  return model(name, s);
};
const req = { type: String, required: true, trim: true };
const opt = { type: String, default: '', trim: true };

const slugify = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

module.exports = {
  User: make('User', { email: { ...req, unique: true, lowercase: true }, password: { type: String, required: true }, role: { type: String, default: 'admin' } }),
  About: make('About', { name: req, title: opt, roles: opt, bio: opt, email: opt, location: opt, github: opt, linkedin: opt, twitter: opt, avatar: opt }),
  Skill: make('Skill', { name: req, level: { type: Number, min: 0, max: 100, default: 50 } }),
  Project: make('Project', { title: req, desc: opt, tags: opt, link: opt, image: opt, featured: { type: Boolean, default: false } }),
  Blog: make('Blog', {
    title: req, slug: { type: String, index: true }, date: opt, excerpt: opt, body: opt, image: opt,
    published: { type: Boolean, default: true }, likes: { type: Number, default: 0 },
  }, s => s.pre('validate', function (next) { if (!this.slug) this.slug = slugify(this.title); next(); })),
  Experience: make('Experience', { role: req, company: opt, period: opt, desc: opt }),
  Testimonial: make('Testimonial', { name: req, role: opt, quote: req }),
  Service: make('Service', { title: req, desc: opt }),
  Message: make('Message', { name: req, email: req, message: req, read: { type: Boolean, default: false } }),
  Media: make('Media', { filename: req, url: req, mimetype: opt, size: Number }),
  Stat: make('Stat', { key: { type: String, unique: true }, visits: { type: Number, default: 0 } }),
};
