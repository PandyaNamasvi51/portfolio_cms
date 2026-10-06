require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const connectDB = require('./src/config/db');

const app = express();
const origins = (process.env.CLIENT_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

app.set('trust proxy', 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ['https://fonts.gstatic.com'], imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'self'"],
    },
  },
}));
app.use(cors({ origin: origins.length ? origins : false }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/auth', require('./src/routes/auth'));
app.use('/upload', require('./src/routes/upload'));
app.use('/contact', require('./src/routes/contact'));
app.use('/stats', require('./src/routes/stats'));
app.use('/', require('./src/routes/content'));

// The portfolio (/) and admin panel (/admin) are served by this same server.
app.use(express.static(path.join(__dirname, '../frontend')));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid id' });
  if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large (max 5 MB)' });
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' });
});

const PORT = process.env.PORT || 5000;
connectDB().then(() => app.listen(PORT, () => console.log(`API running on port ${PORT}`)));
