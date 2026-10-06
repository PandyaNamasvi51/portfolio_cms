const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const { Media } = require('../models');

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '../../uploads'),
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + ALLOWED[file.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(ALLOWED[file.mimetype] ? null : Object.assign(new Error('Only JPG, PNG, WebP or GIF images are allowed'), { status: 400 }), !!ALLOWED[file.mimetype]),
});

router.post('/image', auth, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Send the file in the "image" field' });
    const url = `${process.env.PUBLIC_URL || ''}/uploads/${req.file.filename}`;
    const media = await Media.create({ filename: req.file.filename, url, mimetype: req.file.mimetype, size: req.file.size });
    res.status(201).json(media);
  } catch (e) { next(e); }
});

module.exports = router;
